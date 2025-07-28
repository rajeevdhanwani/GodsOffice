import React, { useEffect, useState } from "react";
import { Typography, Grid, Card, CardContent } from "@mui/material";
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

const DashboardPage = () => {
  const [stats, setStats] = useState({
    clients: 0,
    tasks: 0,
    pending: 0,
    completed: 0,
  });

  const fetchStats = async () => {
    try {
      const [clientsRes, tasksRes] = await Promise.all([
        fetch("${API_BASE_URL}/api/imports/clients/count"),
        fetch("${API_BASE_URL}/api/tasks/summary"),
      ]);
      const clientsData = await clientsRes.json();
      const tasksData = await tasksRes.json();
      setStats({
        clients: clientsData.count,
        tasks: tasksData.total,
        pending: tasksData.pending,
        completed: tasksData.completed,
      });
    } catch (err) {
      console.error("Error fetching dashboard data", err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const pieData = [
    { name: "Pending", value: stats.pending },
    { name: "Completed", value: stats.completed },
    { name: "Remaining", value: stats.tasks - stats.pending - stats.completed },
  ];

  return (
    <>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">Total Clients</Typography>
              <Typography variant="h4">{stats.clients}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">Total Tasks</Typography>
              <Typography variant="h4">{stats.tasks}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">Completed Tasks</Typography>
              <Typography variant="h4">{stats.completed}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Task Status Overview
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    label
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  );
};

export default DashboardPage;
