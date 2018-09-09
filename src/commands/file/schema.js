'use strict';

const Joi = require('joi');

const commonSchema = Joi.object({
  name: Joi.string().required()
}).unknown();



module.exports = {
  commonValidation: (val) => Joi.validate(val, commonSchema)
};