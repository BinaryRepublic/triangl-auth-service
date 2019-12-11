# SE_09 Cyber Security
This README contains an overview of all applied tools, methods and implementations for my alternative SE_09 assessment, as well as my reasoning behind the work.

# Introduction

Triangl was my CODE project in WS-2018 and our goal was, to enable anonymous tracking of smartphones for shopping malls, stores or airports. Concretely, we placed multiple WIFI access-points in a room, which were connected in a mesh-network and were running OpenWrt. When deployed they are listening for Probe requests sending this information to the back-end. If 3 or more access-point receive a request from the same device, our back-end service calculates the position of the device based on signal-strength and time-of-flight utilizing lateration.

The computed tracking points are ingested into our ingestion-db and pushed into the stream (processing-pipeline). This stream will convert the data to a better queryable format and write it into the analyzing-db. The dashboard-service will provide data from this database to the front-end dashboard which our customers can use to see the analyzed data.

Architectural overview: [https://github.com/binaryrepublic/triangl-infrastructure#overview](https://github.com/binaryrepublic/triangl-infrastructure#overview)

# Threat modelling

Before implementing anything I tried to identify all attack-vectors and possible breaches on the system and ordered them by the impact. I started with some high-level threats that affect the system as a whole and then inspected the exposed individual services and how they are communicating with external parties:

[PDF: Threat modelling](https://github.com/BinaryRepublic/triangl-auth-service/blob/master/docs/threat-modelling.pdf)

Based on this I’d like to elaborate a little more on my architectural decisions and the implemented solutions below.

# Applied architectural concepts
## Principle of least privilege

One of the advantages of our micro-service architecture is the possibility to restrict access on a service level. Even though all cluster applications are within the same network, I set-up access rights on two different levels:

1. Each service has a specific GCP [service account assigned](https://github.com/BinaryRepublic/triangl-infrastructure/blob/master/terraform/gcp-service-accounts.tf), that allows it access to specific resources [using IAM bindings.](https://github.com/BinaryRepublic/triangl-infrastructure/blob/master/terraform/gcp-iam-bindings.tf)
2. Each service that accesses a SQL database uses an [individual database user](https://github.com/BinaryRepublic/triangl-infrastructure/blob/master/terraform/gcp-sql-database.tf), so that activity can be audited and access can be restricted as well:

| **service**                | **granted database access**  | **granted index/table access**                                        |
| -------------------------- | ---------------------------- | --------------------------------------------------------------------- |
| tracking-ingestion-service | GCP Datastore                | r/w TrackingPoint ; r Customer                                        |
| customer-service           | GCP Datastore                | r/w Customer                                                          |
| processing-pipeline        | GCP Datastore<br>SQL serving | r/w TrackingPoint ; r/w Customer<br>r/w tracking_point ; r/w customer |
| dashboard-service          | SQL serving                  | r tracking_point ; r customer                                         |
| auth-service               | SQL auth                     | r/w auth ; r/w user                                                   |

## Sandboxing and Firewalls

Due to the Kubernetes setup with an NGINX ingress controller to handle incoming traffic, only exposed endpoints and ports are opened. The ingress configuration can be found [here](https://github.com/BinaryRepublic/triangl-infrastructure/tree/master/kubernetes/ingress)[.](https://github.com/BinaryRepublic/triangl-infrastructure/blob/master/kubernetes/ingress.yml)
Also, by default each deployed service is completely sandboxed. It cannot reach any other service unless the target has explicitly opened a port ([auth-service example](https://github.com/BinaryRepublic/triangl-infrastructure/blob/master/terraform/k8s-deployment-auth-service.tf#L116)). Even if the attacker gains access to any service and executes malicious code, he has no full access to all other applications inside the cluster.

## IP white-listing

To further mitigate the risk of breaching authentication of publicly exposed endpoints, I tried to restrict access based on source IP address. Here is an overview of endpoints that are restricted:

| **endpoint**                                      | **restricted audience**                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| https://api.triangl.io/tracking-ingestion-service | customers equipped with our tracking setup (access-points) → for each customer we could whitelist their public IP address; or in case it is dynamic set up a VPN<br>→ whitelisting is handled [this way](https://github.com/BinaryRepublic/triangl-infrastructure/blob/master/kubernetes/ingress/ingress-ingestion.yml#L8)                                                                                                                 |
| https://api.triangl.io/customer-service           | restricted to us → in the beginning we would onboard a customer manually, such that they do not have to enter any data using the web-app<br>→ whitelisting could be handled by just allowing our office-ip [like this](https://github.com/BinaryRepublic/triangl-infrastructure/tree/master/kubernetes/ingress)                                                                                                                            |
| Kubernetes API (kubectl)                          | restricted to our developers → the K8s API is an extremely sensible entity in our system, as it grants access to nearly all back-end resources (and secrets! → *Secret Handling*)<br>In the best case scenario we could implement a DMZ network which only contains developers that have to maintain the cluster. This network can then be assigned to a static public IP and this IP could then be whitelisted for accessing the K8s API. |

## Auditing and monitoring

For error tracking and alerting I implemented Sentry ([example](https://github.com/BinaryRepublic/triangl-dashboard-service/blob/master/build.gradle#L74)) so we can quickly respond to application failures or unexpected behaviour. Also, I [added a Datadog agent](https://github.com/BinaryRepublic/triangl-infrastructure/tree/master/kubernetes/datadog) which is running on each Kubernetes node and which sends metrics about health status and running pods. In case any node dies or any pod is running into a restart loop we can simply setup alerts to get notified. This enables us to also send custom metrics (e.g. about tracking-ingestion events) in the future. Thresholds can be configured, to detect unusual ingestion behaviour and we could get notified.

As we run on Google Cloud the most reasonable solution for proper database auditing is https://cloud.google.com/audit-logs/. However, I’m well aware of the possibility to configure this by myself. MySQL databases (as we use) provide [audit logging features](https://dev.mysql.com/doc/refman/5.7/en/audit-log-logging-configuration.html) that writes logs into files. These files could be written on mounted volumes, to ensure their durability even if the DBMS/DB container is failing.

## Disaster recovery

For big database incidents, I tried to set-up some basic plans on how to recover quickly:

| incident                                         | disaster-recovery-plan                                                                                                                                                                                                                                   |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| serving-db compromised and dropped or modified   | - detect db-user that executed operation (audit-trails), **delete user**<br>- trigger re-ingestion from ingestion database<br>- scale up ingestion-pipeline to accelerate re-ingestion<br>- inspect attack-vector and eliminate cause → was data leaked? |
| ingestion-db compromised and dropped or modified | - detect db-userthat executed operation (audit-trails), **revoke user access**<br>- recreate database from last successful snapshot<br>- inspect attack-vector and eliminate cause → was data leaked?                                                    |

- Recovery Point Objective: 2h (ingestion_db automated backups)
- Recovery Time Objective: 2h (reindexing from ingestion_db)

## Secret handling

Currently database and Google service account secrets are stored as Kubernetes secrets inside the cluster. The biggest threat I see could be an attacker that gains somehow access to the Kubernetes API. This way all secrets could be leaked. As I protected the API with IP whitelisting and the default .kubeconfig authentication, I do not think the risk of an attacker gaining access is too big, which is why I did not focus on this.
However, to protect against leaking secrets through the Kubernetes API we could store the secrets in an external Vault, that has sophisticated access-control management. (e.g. [Hashicorp Vault](https://www.vaultproject.io/))

# Application security implementations
## OIDC Authorization Code Flow with PKSE

After looking for a proper OAuth2 grant type I ended up with 2 options:

- Implicit Grant
- Authorization Code Grant with PKSE

Until recent times **Implicit Grant** was the way to go for SPA, because it was considered as a sufficient option to securely request an access-token by sending user credentials. However, since the requested tokens are being returned in the redirect URL, there are multiple attack vectors:

- redirects can be intercepted (man-in-the-middle, even with HTTPS when using corporate SSL certificates to inspect traffic)
- redirects can be read from the browser history
- redirects can be accessed via third-party libraries

→ **Authorization Code Flow with PKSE** does not involve any access_token’s in the redirect URL. Instead the redirect URL contains an authorization grant, that can be used to receive an access_token after the redirect. **PKSE** stands for **Proof Key for Code Exchange** and adds another layer of security, since the default **Authorization Code Flow** requires the client_secret which cannot be stored securely in the browser. Instead of the client_secret the verification is based on a **code_challenge** and a **code_verifier**, that is generated by the client and unguessable by an attacker.

*Here is what happens:*

1. [client generates a random](https://github.com/BinaryRepublic/triangl-dashboard/blob/develop/src/controllers/AuthController.js#L61) [**code_verifier**](https://github.com/BinaryRepublic/triangl-dashboard/blob/develop/src/controllers/AuthController.js#L61) [and uses it to create the](https://github.com/BinaryRepublic/triangl-dashboard/blob/develop/src/controllers/AuthController.js#L61) [**code_challenge**](https://github.com/BinaryRepublic/triangl-dashboard/blob/develop/src/controllers/AuthController.js#L61) [hash](https://github.com/BinaryRepublic/triangl-dashboard/blob/develop/src/controllers/AuthController.js#L61)
2. [client sends](https://github.com/BinaryRepublic/triangl-dashboard/blob/develop/src/controllers/AuthController.js#L66) [**authorize request**](https://github.com/BinaryRepublic/triangl-dashboard/blob/develop/src/controllers/AuthController.js#L66) [to initiate authentication session](https://github.com/BinaryRepublic/triangl-dashboard/blob/develop/src/controllers/AuthController.js#L66)
3. [auth-service stores](https://github.com/BinaryRepublic/triangl-auth-service/blob/master/src/controller/AuthController.js#L24) [**code_challenge**](https://github.com/BinaryRepublic/triangl-auth-service/blob/master/src/controller/AuthController.js#L24)[, requested](https://github.com/BinaryRepublic/triangl-auth-service/blob/master/src/controller/AuthController.js#L24) [**audience**](https://github.com/BinaryRepublic/triangl-auth-service/blob/master/src/controller/AuthController.js#L24) [and](https://github.com/BinaryRepublic/triangl-auth-service/blob/master/src/controller/AuthController.js#L24) [**client_id**](https://github.com/BinaryRepublic/triangl-auth-service/blob/master/src/controller/AuthController.js#L24)
4. [auth-service returns](https://github.com/BinaryRepublic/triangl-auth-service/blob/master/src/controller/AuthController.js#L31) [**redirect**](https://github.com/BinaryRepublic/triangl-auth-service/blob/master/src/controller/AuthController.js#L31) [to self-hosted](https://github.com/BinaryRepublic/triangl-auth-service/blob/master/src/controller/AuthController.js#L31) [**login.html**](https://github.com/BinaryRepublic/triangl-auth-service/blob/master/src/controller/AuthController.js#L31)
5. [user enters email and password and submits form to](https://github.com/BinaryRepublic/triangl-auth-service/blob/master/src/view/login.html#L19) [**login**](https://github.com/BinaryRepublic/triangl-auth-service/blob/master/src/view/login.html#L19) [endpoint on auth-service](https://github.com/BinaryRepublic/triangl-auth-service/blob/master/src/view/login.html#L19)
6. [auth-service verifies user credentials and returns a](https://github.com/BinaryRepublic/triangl-auth-service/blob/master/src/controller/UserController.js#L23) [**redirect_uri**](https://github.com/BinaryRepublic/triangl-auth-service/blob/master/src/controller/UserController.js#L23) [including the](https://github.com/BinaryRepublic/triangl-auth-service/blob/master/src/controller/UserController.js#L23) [**code**](https://github.com/BinaryRepublic/triangl-auth-service/blob/master/src/controller/UserController.js#L23) [to request tokens](https://github.com/BinaryRepublic/triangl-auth-service/blob/master/src/controller/UserController.js#L23)
7. [user is redirected to client and requests the tokens by the](https://github.com/BinaryRepublic/triangl-dashboard/blob/develop/src/controllers/AuthController.js#L86) [**code**](https://github.com/BinaryRepublic/triangl-dashboard/blob/develop/src/controllers/AuthController.js#L86) [from the](https://github.com/BinaryRepublic/triangl-dashboard/blob/develop/src/controllers/AuthController.js#L86) [**redirect_uri**](https://github.com/BinaryRepublic/triangl-dashboard/blob/develop/src/controllers/AuthController.js#L86) [and the previously stored](https://github.com/BinaryRepublic/triangl-dashboard/blob/develop/src/controllers/AuthController.js#L86) [**code_verifier**](https://github.com/BinaryRepublic/triangl-dashboard/blob/develop/src/controllers/AuthController.js#L86)
8. [client receives the tokens and stores them in local-storage](https://github.com/BinaryRepublic/triangl-dashboard/blob/develop/src/controllers/AuthController.js#L92)
![src: https://christianlydemann.com/implicit-flow-vs-code-flow-with-pkce/](https://i1.wp.com/christianlydemann.com/wp-content/uploads/2018/05/oidc-code-flow-pkce-1.png?resize=791%2C618&ssl=1)
src: https://christianlydemann.com/implicit-flow-vs-code-flow-with-pkce/

## Token generation and usage

Since I am following the OIDC standard, access_token, refresh_token and id_token are **JWT** tokens. To sign and later verify them I use asynchronous encryption (RS256) involving a private and public key (RSA key pair). Both keys are injected into the auth-service as environment variables, such that they are not laying in the source code which would be a huge security threat. During [token generation](https://github.com/BinaryRepublic/triangl-auth-service/blob/master/src/service/AuthService.js#L79) the private key is used to encrypt the tokens signature. Later when the client sends a request to any **resource server** (like dashboard-service) the token signature can be verified using the public key which is exposed on [GET /auth-service/auth/.well-known/jwks.json](https://github.com/BinaryRepublic/triangl-auth-service/blob/master/src/controller/AuthController.js#L77). To do this, the dashboard-service is [fetching the public key from the auth-service on start-up.](https://github.com/BinaryRepublic/triangl-dashboard-service/blob/master/src/main/kotlin/com/triangl/dashboard/support/JwtTokenProvider.kt#L28)

## Authorization

In order to only allow a user access to the respective customers data, the customer table contains a **userId** column. This is used to assign a user to a customer. When the dashboard-service parses and validates the JWT access_token it also [checks the containing user_id](https://github.com/BinaryRepublic/triangl-dashboard-service/blob/master/src/main/kotlin/com/triangl/dashboard/support/JwtTokenProvider.kt#L44). Later when loading customer data from the database only data [for the customer of the SecurityContext is queried.](https://github.com/BinaryRepublic/triangl-dashboard-service/blob/master/src/main/kotlin/com/triangl/dashboard/services/VisitorService.kt#L20) There are no roles/authorities implemented yet. However this could easily be added by [setting the SecurityContext (third argument).](https://github.com/BinaryRepublic/triangl-dashboard-service/blob/master/src/main/kotlin/com/triangl/dashboard/support/JwtTokenProvider.kt#L47)


## Password hashing

For password hashing I used **bcrypt** which involves different aspects to make the hash secure:

- Random **Salt** is generated and added to the hash, so that Rainbow and lookup tables cannot work
- Since dictionary or brute-force attacks on each hash individually cannot be prevented by adding **Salt**, **bcrypt** adds another technique called **key stretching.** The hash-function becomes computational more expensive, so that testing look-up tables or brute-forcing takes very long.

I also read about the concept of **Pepper**, but I did not implement it due to the following downsides:

- maintainability is generally questioned, as it has to be stored somewhere else
- rotation of Pepper very difficult, as hashes are a one-way-function and the initial pepper is always needed → big security flaw, not very effective

Also I concluded that it might be extremely risky to loose **Pepper,** as in this case all users would loose access to their accounts unless they reset their passwords.

## SQL injection prevention

To prevent SQL injection I always used libraries that either run prepared statements by passing query strings and parameters separately to the database, or that use a query builder that is protecting against SQL injection. Examples:

- [auth-service query builder](https://github.com/BinaryRepublic/triangl-auth-service/blob/master/src/repository/AuthRepository.js#L51)
- [dashboard-service prepared statements](https://github.com/BinaryRepublic/triangl-dashboard-service/blob/master/src/main/kotlin/com/triangl/dashboard/repository/servingDB/TrackingPointRepository.kt#L10)
## XSS protection

In order to mitigate the risk of XSS attacks [I implemented some basic character escaping](https://github.com/BinaryRepublic/triangl-auth-service/blob/master/index.js#L11) for all JSON values in the response body. Yet, I only implemented it in the **auth-service,** as this is currently the only service that allows direct user input (user registration).

Also VueJS is pretty save, as long as the whole page is rendered on client-side and as long as the **v-html** directive is not being used. Right now we always use the Mustache syntax (e.g. [{{email}}](https://github.com/BinaryRepublic/triangl-dashboard/blob/develop/src/components/shared/Auth/Auth.vue#L3)), which does not execute any scripts or expressions. Unfortunately many libraries still use v-html which is why back-end sanitizing is still necessary.

## CSRF protection

There are several steps I took to protect against CSRF attacks.

1. [When initialising the authentication flow the web-app generates a random](https://github.com/BinaryRepublic/triangl-dashboard/blob/develop/src/controllers/AuthController.js#L60) [**state**](https://github.com/BinaryRepublic/triangl-dashboard/blob/develop/src/controllers/AuthController.js#L60) that is unguessable by an attacker. This **state** is part of the before mentioned authorisation request (step 2) to the auth-service. After the user logged in and before the **code** and the **code_verifier** is being exchanged with the tokens (step 7), this previously generated **state** is being compared against the **state** from the **redirect_uri.** Only if both match the request token is requested. (The code_challenge and the code_verifier **cannot** protect against CSRF as they are being compared server-side.)
2. All requests towards back-end resource servers need to contain an **Authorization Header** containing a valid JWT access_token. As CSRF attacks cannot set custom headers from local storage, they are ineffective for any request to the back-end that involves authentication. This is why I did not implement any CSRF token, but in case new state-changing endpoints would be added in the back-end that do not require authentication, it should be surely added.
## CORS policy

Our domain setup looks like this:

| domain         | purpose                                                                                                                     |
| -------------- | --------------------------------------------------------------------------------------------------------------------------- |
| app.triangl.io | Hosts web-app                                                                                                               |
| api.triangl.io | Domain for accessing back-end services, concretely accessible for web-app are:<br><br>- auth-service<br>- dashboard-service |

This is why I [set up the](https://github.com/BinaryRepublic/triangl-auth-service/blob/master/index.js#L19) [**Access-Control-Allow-Origin**](https://github.com/BinaryRepublic/triangl-auth-service/blob/master/index.js#L19) [header](https://github.com/BinaryRepublic/triangl-auth-service/blob/master/index.js#L19) to “https://api.triangl.io”. Even though we don’t use cookie session based authentication this just adds another layer of security against cross-site attacks.

# Self assessment

After researching about all the mentioned different attack-vectors and reasoning about solutions to prevent these, I feel that I have a solid basic understanding about the topic. Also I gained some working experience with JWT tokens and authorities throughout the last years. Originally we were using Auth0 as a managed authentication service. After implementing the OIDC Authorization Grant Flow with PKSE by myself, I got a deeper understanding of all the involved challenges to make user accounts and authentication secure. Also I gained some knowledge and practical experience with password hashing, CSRF prevention and other techniques as described above. I think all of this will help me in the future, even when using managed SaaS solutions, because knowing the underlaying layers and concepts helps to integrate them in a proper way.

After all I would assess myself at a solid Level 1.

# Learning Resources
## Conducting a security audit
https://blog.dashlane.com/conduct-internal-security-audit/

## OAuth2.0 and OIDC

https://medium.com/@darutk/understanding-id-token-5f83f50fa02e

## Setting up authentication flow
https://christianlydemann.com/implicit-flow-vs-code-flow-with-pkce/

https://auth0.com/docs/protocols/oauth2/mitigate-csrf-attacks


https://www.oauth.com/oauth2-servers/access-tokens/authorization-code-request/

https://connect2id.com/products/server/docs/api/token#token-response

https://tools.ietf.org/html/rfc7009
https://www.ibm.com/support/knowledgecenter/en/SSEQTP_liberty/com.ibm.websphere.wlp.doc/ae/twlp_oidc_revoke.html

https://www.oauth.com/oauth2-servers/access-tokens/refreshing-access-tokens/


## Password hashing

https://crackstation.net/hashing-security.htm

## XSS Protection
https://blog.sqreen.com/xss-in-vue-js/



## DDOS Protection
https://blog.cloudflare.com/how-cloudflares-architecture-allows-us-to-scale-to-stop-the-largest-attacks/

https://blog.cloudflare.com/memcrashed-major-amplification-attacks-from-port-11211/


https://spoofer.caida.org/summary.php

https://blog.cloudflare.com/ssdp-100gbps/

https://en.wikipedia.org/wiki/SYN_flood

https://medium.com/cloudflare-blog/unmetered-mitigation-ddos-protection-without-limits-a7978185c3cf

https://www.geekwire.com/2018/largest-ddos-attack-yet-recorded-staggered-github-wednesday/

https://www.geekwire.com/2018/memcached-servers-used-launch-record-setting-ddos-attacks/

## Penetration Testing
https://www.imperva.com/learn/application-security/penetration-testing/

## CSRF

https://docs.spring.io/spring-security/site/docs/3.2.0.CI-SNAPSHOT/reference/html/csrf.html

