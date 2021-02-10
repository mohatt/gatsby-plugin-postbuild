import { Promise } from 'bluebird'
import glob from 'glob'
import path from 'path'
import _ from 'lodash'
import { getOption, reportError } from './util'

/**
 * @typedef Task
 * @type {object}
 * @property {string} id - Task ID.
 * @property {string} main - Task API entry file.
 * @property {string} path - Task directory.
 * @property {object} api - Task API exports.
 * @property {object} [options=] - Task options exports.
 * @property  {object} defaults - Task options defaults.
 * @property  {object} schema - Task options schema.
 */

/**
 * Handles tasks defined within the plugin
 * Should not have more than 1 instance
 */
export class Tasks {
  /** @type {[Task]} */
  tasks

  /**
   * Finds and initializes tasks defined under {directory}
   *
   * @param {string} directory Absolute path to directory
   */
  constructor (directory) {
    this.tasks = glob.sync('*/index.js', { cwd: directory }).map(taskEntry => {
      const task = {}
      task.main = require.resolve(path.join(directory, taskEntry))
      task.path = path.dirname(task.main)
      task.id = path.basename(task.path)
      task.api = require(task.main)
      try {
        task.options = require(path.join(task.path, 'options.js'))
      } catch (e) {
        task.options = null
      }
      return task
    })
  }

  /**
   * Gets a list of all tasks
   *
   * @return {[Task]}
   */
  getTasks () {
    return this.tasks
  }

  /**
   * Gets a task object by id
   *
   * @param {string} id
   * @return {Task}
   */
  getTask (id) {
    return this.tasks.filter(task => task.id === id).shift()
  }

  /**
   * Gets an object of task ids as keys and specified task field as value.
   *
   * @param {string} field
   * @return {Object}
   */
  getFields (field) {
    return Object.fromEntries(
      this.tasks.map(task => [task.id, _.get(task, field)])
    )
  }

  /**
   * Runs a task api.
   *
   * @param {string} api
   * @param {Object} params
   * @param {Object} gatsby
   * @return {Promise<unknown[]>}
   */
  run ({ api, params = {}, gatsby }) {
    return Promise.mapSeries(this.tasks, async task => {
      const options = getOption(task.id)
      try {
        await task.api[api]({ ...params, options }, gatsby)
      } catch (e) {
        reportError(`Error occured while running task "${task.id}"`, e)
      }
    })
  }
}

const tasksInstance = new Tasks(path.join(__dirname, 'tasks'))

export default tasksInstance
