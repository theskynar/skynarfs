'use strict';

const Joi = require('joi');

const createSchema = Joi.object({
  blocksize: Joi.number().min(32).required(),
  name: Joi.string().min(2).required(),
  blocks: Joi.number().min(500).required()
}).unknown();

const commonSchema = Joi.object({
  name: Joi.string().min(2).required()
}).unknown();



module.exports = {
  createValidation: (val) => Joi.validate(val, createSchema),
  commonValidation: (val) => Joi.validate(val, commonSchema)
};