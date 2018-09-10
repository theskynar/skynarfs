'use strict';

const Joi = require('joi');

const commonSchema = Joi.object({
  file: Joi.string().required()
}).unknown();



module.exports = {
  fileValidation: (val) => Joi.validate(val, commonSchema)
};