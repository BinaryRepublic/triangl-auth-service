const tagsToReplace = {
  '<': '&lt;',
  '>': '&gt;'
};

function replaceTag(tag) {
  return tagsToReplace[tag] || tag;
}

function safe_tags_replace(str) {
  return str.replace(/[&<>]/g, replaceTag);
}

function deepSanitize(obj) {
  Object.keys(obj).forEach(key => {
    if (typeof obj[key] === 'string') {
      obj[key] = safe_tags_replace(obj[key]);
    }
    if (typeof obj[key] === 'object') {
      deepSanitize(obj[key])
    }
  })
}

module.exports = {
  deepSanitize
};
