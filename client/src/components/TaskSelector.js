import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Typography,
  Chip,
  Alert
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

const TaskSelector = ({ 
  tasks = [], 
  onTasksSelected, 
  disabled = false,
  buttonText = "Add from Tasks" 
}) => {
  const [open, setOpen] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState([]);

  const handleOpen = () => {
    setSelectedTasks([]);
    setOpen(true);
  };

  const handleClose = () => {
    setSelectedTasks([]);
    setOpen(false);
  };

  const handleTaskToggle = (task) => {
    setSelectedTasks(prev => {
      const exists = prev.find(t => t._id === task._id);
      if (exists) {
        return prev.filter(t => t._id !== task._id);
      } else {
        return [...prev, task];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedTasks.length === tasks.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks([...tasks]);
    }
  };

  const handleConfirmSelection = () => {
    onTasksSelected(selectedTasks);
    handleClose();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'success';
      case 'closed':
        return 'info';
      case 'in progress':
        return 'warning';
      default:
        return 'default';
    }
  };

  if (tasks.length === 0) {
    return null;
  }

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<AddIcon />}
        onClick={handleOpen}
        disabled={disabled}
      >
        {buttonText} ({tasks.length})
      </Button>

      <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              Select Billable Tasks
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {selectedTasks.length} of {tasks.length} selected
            </Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {tasks.length === 0 ? (
            <Alert severity="info">
              No billable tasks found for this client.
            </Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        indeterminate={selectedTasks.length > 0 && selectedTasks.length < tasks.length}
                        checked={tasks.length > 0 && selectedTasks.length === tasks.length}
                        onChange={handleSelectAll}
                      />
                    </TableCell>
                    <TableCell>Service</TableCell>
                    <TableCell>Period</TableCell>
                    <TableCell>Due Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Rate</TableCell>
                    <TableCell>SAC Code</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tasks.map((task) => {
                    const isSelected = selectedTasks.some(t => t._id === task._id);
                    
                    return (
                      <TableRow 
                        key={task._id} 
                        hover 
                        onClick={() => handleTaskToggle(task)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell padding="checkbox">
                          <Checkbox checked={isSelected} />
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {task.serviceName}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {task.serviceCode}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {task.servicePeriod}
                          </Typography>
                          {task.financialYear && (
                            <Typography variant="caption" color="textSecondary">
                              FY: {task.financialYear}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {formatDate(task.dueDate)}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={task.status || 'Completed'}
                            color={getStatusColor(task.status)}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {formatCurrency(task.billingRate || 1000)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="textSecondary">
                            {task.sacCode || 'N/A'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmSelection}
            variant="contained"
            disabled={selectedTasks.length === 0}
          >
            Add Selected Tasks ({selectedTasks.length})
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TaskSelector;
