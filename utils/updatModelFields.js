const updateModelFields = (body, allowedUpdates) => {
  const data = {};
  allowedUpdates.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      data[field] = body[field];
    }
  });
  return data;
};

module.exports = updateModelFields;