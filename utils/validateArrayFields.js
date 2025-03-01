const validateArrayFields = (field, allowedValues) => {
  const parsedField = JSON.parse(field);
  const invalidValues = parsedField.filter((value) => !allowedValues.includes(value));
  
  if (invalidValues.length) {
    throw new Error(`Invalid values: ${invalidValues.join(", ")}`);
  }
  return parsedField;
};

module.exports = validateArrayFields;