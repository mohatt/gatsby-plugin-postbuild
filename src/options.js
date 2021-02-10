export const defaults = {}
export function schema (Joi, tasks = {}) {
  return Joi.object({
    ...tasks
  })
}
