/**
 * Task Billing Utility Functions
 * Handles integration between Task Management and Invoice Management
 */

/**
 * Get billable tasks for a specific client
 * @param {string} clientCode - Client code
 * @returns {Array} - Array of billable tasks
 */
async function getBillableTasks(clientCode) {
  try {
    const Task = require('../server_models/Task');
    
    // Find tasks that are completed and not yet billed
    const tasks = await Task.find({
      clientCode: clientCode,
      status: { $in: ["Completed", "Closed"] },
      $or: [
        { billingStatus: { $exists: false } },
        { billingStatus: "billable" },
        { billingStatus: "not_billable" }
      ]
    }).sort({ completedAt: -1, dueDate: -1 });
    
    // Filter only billable tasks
    return tasks.filter(task => {
      // If billingStatus doesn't exist or is billable, include it
      return !task.billingStatus || task.billingStatus === "billable";
    });
  } catch (error) {
    console.error('Error fetching billable tasks:', error);
    throw new Error('Failed to fetch billable tasks');
  }
}

/**
 * Get task details with service information for billing
 * @param {Array} taskIds - Array of task IDs
 * @returns {Array} - Array of task details with service info
 */
async function getTasksForBilling(taskIds) {
  try {
    const Task = require('../server_models/Task');
    const Service = require('../server_models/Service');
    
    const tasks = await Task.find({ _id: { $in: taskIds } });
    
    // Get service details for each task
    const tasksWithService = await Promise.all(
      tasks.map(async (task) => {
        const service = await Service.findOne({ serviceCode: task.serviceCode });
        
        return {
          _id: task._id,
          clientCode: task.clientCode,
          serviceCode: task.serviceCode,
          serviceName: task.serviceName,
          servicePeriod: task.servicePeriod,
          financialYear: task.financialYear,
          completedAt: task.completedAt,
          dueDate: task.dueDate,
          remarks: task.remarks,
          // Service details
          sacCode: service ? service.sacCode : '',
          serviceGroup: service ? service.serviceGroup : '',
          // Billing details
          billingRate: task.billingRate || 0,
          billingStatus: task.billingStatus || 'billable'
        };
      })
    );
    
    return tasksWithService;
  } catch (error) {
    console.error('Error getting tasks for billing:', error);
    throw new Error('Failed to get tasks for billing');
  }
}

/**
 * Mark tasks as billed and update billing information
 * @param {Array} taskIds - Array of task IDs
 * @param {string} invoiceId - Invoice ID
 * @param {number} billedAmount - Total billed amount (optional)
 * @returns {boolean} - Success status
 */
async function markTasksAsBilled(taskIds, invoiceId, billedAmount = null) {
  try {
    const Task = require('../server_models/Task');
    
    const updateData = {
      billingStatus: "billed",
      billedInvoiceId: invoiceId,
      billedDate: new Date()
    };
    
    if (billedAmount !== null) {
      updateData.billedAmount = billedAmount;
    }
    
    const result = await Task.updateMany(
      { _id: { $in: taskIds } },
      updateData
    );
    
    return result.modifiedCount > 0;
  } catch (error) {
    console.error('Error marking tasks as billed:', error);
    throw new Error('Failed to mark tasks as billed');
  }
}

/**
 * Unmark tasks from being billed (in case invoice is cancelled)
 * @param {Array} taskIds - Array of task IDs
 * @returns {boolean} - Success status
 */
async function unmarkTasksFromBilling(taskIds) {
  try {
    const Task = require('../server_models/Task');
    
    const result = await Task.updateMany(
      { _id: { $in: taskIds } },
      {
        $unset: {
          billingStatus: "",
          billedInvoiceId: "",
          billedDate: "",
          billedAmount: ""
        }
      }
    );
    
    return result.modifiedCount > 0;
  } catch (error) {
    console.error('Error unmarking tasks from billing:', error);
    throw new Error('Failed to unmark tasks from billing');
  }
}

/**
 * Get default billing rate for a service
 * @param {string} serviceCode - Service code
 * @returns {number} - Default billing rate
 */
async function getDefaultBillingRate(serviceCode) {
  try {
    const Service = require('../server_models/Service');
    
    const service = await Service.findOne({ serviceCode });
    
    // You can add a billingRate field to Service model later
    // For now, return a default rate based on service group or priority
    if (!service) return 1000; // Default rate
    
    // Simple logic based on priority
    switch (service.priority) {
      case 'High': return 2000;
      case 'Medium': return 1500;
      case 'Low': return 1000;
      default: return 1000;
    }
  } catch (error) {
    console.error('Error getting default billing rate:', error);
    return 1000; // Fallback rate
  }
}

/**
 * Calculate billing summary for a client
 * @param {string} clientCode - Client code
 * @returns {Object} - Billing summary
 */
async function getClientBillingSummary(clientCode) {
  try {
    const Task = require('../server_models/Task');
    
    const totalTasks = await Task.countDocuments({ clientCode });
    const completedTasks = await Task.countDocuments({ 
      clientCode, 
      status: { $in: ["Completed", "Closed"] }
    });
    const billedTasks = await Task.countDocuments({ 
      clientCode, 
      billingStatus: "billed" 
    });
    const billableTasks = await Task.countDocuments({ 
      clientCode, 
      status: { $in: ["Completed", "Closed"] },
      $or: [
        { billingStatus: { $exists: false } },
        { billingStatus: "billable" }
      ]
    });
    
    return {
      totalTasks,
      completedTasks,
      billedTasks,
      billableTasks,
      billingPercentage: completedTasks > 0 ? Math.round((billedTasks / completedTasks) * 100) : 0
    };
  } catch (error) {
    console.error('Error getting client billing summary:', error);
    throw new Error('Failed to get client billing summary');
  }
}

/**
 * Validate if tasks can be billed
 * @param {Array} taskIds - Array of task IDs
 * @returns {Object} - Validation result
 */
async function validateTasksForBilling(taskIds) {
  try {
    const Task = require('../server_models/Task');
    
    const tasks = await Task.find({ _id: { $in: taskIds } });
    
    const validation = {
      valid: true,
      errors: [],
      warnings: [],
      validTasks: [],
      invalidTasks: []
    };
    
    tasks.forEach(task => {
      // Check if task is already billed
      if (task.billingStatus === "billed") {
        validation.errors.push(`Task ${task.serviceCode} for ${task.servicePeriod} is already billed`);
        validation.invalidTasks.push(task._id);
        validation.valid = false;
      }
      // Check if task is completed
      else if (!["Completed", "Closed"].includes(task.status)) {
        validation.warnings.push(`Task ${task.serviceCode} for ${task.servicePeriod} is not completed yet`);
        validation.invalidTasks.push(task._id);
      }
      else {
        validation.validTasks.push(task._id);
      }
    });
    
    return validation;
  } catch (error) {
    console.error('Error validating tasks for billing:', error);
    throw new Error('Failed to validate tasks for billing');
  }
}

module.exports = {
  getBillableTasks,
  getTasksForBilling,
  markTasksAsBilled,
  unmarkTasksFromBilling,
  getDefaultBillingRate,
  getClientBillingSummary,
  validateTasksForBilling
};
