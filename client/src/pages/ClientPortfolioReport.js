// client/src/components/reports/ClientPortfolioReport.js
import React, { useState, useEffect } from "react";
import "./ClientPortfolioReport.css";

const ClientPortfolioReport = ({ dateRange, onExport }) => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    clientCode: "",
    minRevenue: "",
    sortBy: "totalRevenue"
  });

  useEffect(() => {
    if (dateRange.startDate && dateRange.endDate) {
      fetchReportData();
    }
  }, [dateRange, filters.clientCode]);

  const fetchReportData = async () => {
    setLoading(true);
    setError("");
    
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        ...(filters.clientCode && { clientCode: filters.clientCode })
      });

      const response = await fetch(`/api/reports/client-reports/portfolio?${params}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (response.ok) {
        const data = await response.json();
        setReportData(data);
      } else {
        const errorData = await response.json();
        setError(errorData.message || "Failed to fetch report data");
      }
    } catch (err) {
      setError("Error loading report data");
      console.error("Report fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Completed": return "#10b981";
      case "Pending": return "#f59e0b";
      case "Overdue": return "#ef4444";
      default: return "#6b7280";
    }
  };

  const getPerformanceRating = (completionRate) => {
    if (completionRate >= 90) return { rating: "Excellent", color: "#10b981" };
    if (completionRate >= 75) return { rating: "Good", color: "#3b82f6" };
    if (completionRate >= 60) return { rating: "Average", color: "#f59e0b" };
    return { rating: "Needs Attention", color: "#ef4444" };
  };

  const sortedPortfolios = reportData?.portfolioReports?.sort((a, b) => {
    switch (filters.sortBy) {
      case "totalRevenue":
        return b.metrics.totalRevenue - a.metrics.totalRevenue;
      case "completionRate":
        return b.metrics.completionRate - a.metrics.completionRate;
      case "totalTasks":
        return b.metrics.totalTasks - a.metrics.totalTasks;
      case "clientName":
        return a.client.clientName.localeCompare(b.client.clientName);
      default:
        return 0;
    }
  }) || [];

  const filteredPortfolios = sortedPortfolios.filter(portfolio => {
    if (filters.minRevenue && portfolio.metrics.totalRevenue < parseFloat(filters.minRevenue)) {
      return false;
    }
    return true;
  });

  if (loading) {
    return <div className="report-loading">Loading client portfolio report...</div>;
  }

  if (error) {
    return <div className="report-error">Error: {error}</div>;
  }

  if (!reportData) {
    return <div className="report-no-data">No data available for the selected date range</div>;
  }

  return (
    <div className="client-portfolio-report">
      <div className="report-header">
        <div className="report-title">
          <h2>📊 Client Portfolio Report</h2>
          <p>Comprehensive client service portfolio and performance analysis</p>
        </div>
        <div className="report-controls">
          <button className="btn-export" onClick={onExport}>
            📤 Export Report
          </button>
          <button className="btn-refresh" onClick={fetchReportData}>
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className="report-filters">
        <div className="filter-group">
          <label>Client Code:</label>
          <input
            type="text"
            placeholder="Search by client code"
            value={filters.clientCode}
            onChange={(e) => setFilters(prev => ({ ...prev, clientCode: e.target.value }))}
          />
        </div>
        <div className="filter-group">
          <label>Min Revenue:</label>
          <input
            type="number"
            placeholder="Minimum revenue"
            value={filters.minRevenue}
            onChange={(e) => setFilters(prev => ({ ...prev, minRevenue: e.target.value }))}
          />
        </div>
        <div className="filter-group">
          <label>Sort by:</label>
          <select 
            value={filters.sortBy} 
            onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
          >
            <option value="totalRevenue">Total Revenue</option>
            <option value="completionRate">Completion Rate</option>
            <option value="totalTasks">Total Tasks</option>
            <option value="clientName">Client Name</option>
          </select>
        </div>
      </div>

      <div className="report-summary">
        <div className="summary-card">
          <h3>Total Clients</h3>
          <div className="summary-value">{reportData.summary.totalClients}</div>
        </div>
        <div className="summary-card">
          <h3>Total Revenue</h3>
          <div className="summary-value">{formatCurrency(reportData.summary.totalRevenue)}</div>
        </div>
        <div className="summary-card">
          <h3>Total Tasks</h3>
          <div className="summary-value">{reportData.summary.totalTasks}</div>
        </div>
        <div className="summary-card">
          <h3>Filtered Results</h3>
          <div className="summary-value">{filteredPortfolios.length}</div>
        </div>
      </div>

      <div className="portfolio-grid">
        {filteredPortfolios.map((portfolio, index) => {
          const performance = getPerformanceRating(portfolio.metrics.completionRate);
          
          return (
            <div key={portfolio.client.clientCode} className="portfolio-card">
              <div className="portfolio-header">
                <div className="client-info">
                  <h3>{portfolio.client.clientName}</h3>
                  <div className="client-details">
                    <span className="client-code">{portfolio.client.clientCode}</span>
                    {portfolio.client.firmName && (
                      <span className="firm-name">{portfolio.client.firmName}</span>
                    )}
                  </div>
                  {portfolio.client.withUsSince && (
                    <div className="client-since">
                      With us since: {new Date(portfolio.client.withUsSince).toLocaleDateString()}
                    </div>
                  )}
                </div>
                <div className="performance-badge" style={{ backgroundColor: performance.color }}>
                  {performance.rating}
                </div>
              </div>

              <div className="portfolio-metrics">
                <div className="metrics-row">
                  <div className="metric">
                    <label>Total Revenue</label>
                    <value>{formatCurrency(portfolio.metrics.totalRevenue)}</value>
                  </div>
                  <div className="metric">
                    <label>Paid Revenue</label>
                    <value>{formatCurrency(portfolio.metrics.paidRevenue)}</value>
                  </div>
                  <div className="metric">
                    <label>Outstanding</label>
                    <value className="outstanding">{formatCurrency(portfolio.metrics.outstandingAmount)}</value>
                  </div>
                </div>

                <div className="metrics-row">
                  <div className="metric">
                    <label>Total Tasks</label>
                    <value>{portfolio.metrics.totalTasks}</value>
                  </div>
                  <div className="metric">
                    <label>Completed</label>
                    <value className="completed">{portfolio.metrics.completedTasks}</value>
                  </div>
                  <div className="metric">
                    <label>Completion Rate</label>
                    <value>{portfolio.metrics.completionRate}%</value>
                  </div>
                </div>

                <div className="metrics-row">
                  <div className="metric">
                    <label>Pending Tasks</label>
                    <value className="pending">{portfolio.metrics.pendingTasks}</value>
                  </div>
                  <div className="metric">
                    <label>Overdue Tasks</label>
                    <value className="overdue">{portfolio.metrics.overdueTasks}</value>
                  </div>
                  <div className="metric">
                    <label>Services Count</label>
                    <value>{portfolio.services.length}</value>
                  </div>
                </div>
              </div>

              <div className="portfolio-details">
                <div className="services-section">
                  <h4>Services Portfolio</h4>
                  <div className="services-list">
                    {portfolio.services.slice(0, 5).map((service, idx) => (
                      <span key={idx} className="service-tag">{service}</span>
                    ))}
                    {portfolio.services.length > 5 && (
                      <span className="service-tag more">+{portfolio.services.length - 5} more</span>
                    )}
                  </div>
                </div>

                <div className="team-section">
                  <h4>Team Members</h4>
                  <div className="team-list">
                    {portfolio.teamMembers.slice(0, 3).map((member, idx) => (
                      <span key={idx} className="team-tag">{member.name}</span>
                    ))}
                    {portfolio.teamMembers.length > 3 && (
                      <span className="team-tag more">+{portfolio.teamMembers.length - 3} more</span>
                    )}
                  </div>
                </div>

                <div className="records-section">
                  <h4>Document Records</h4>
                  <div className="records-stats">
                    <span>Inward: {portfolio.recordsCount.inward}</span>
                    <span>Outward: {portfolio.recordsCount.outward}</span>
                  </div>
                </div>
              </div>

              <div className="portfolio-progress">
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ 
                      width: `${portfolio.metrics.completionRate}%`,
                      backgroundColor: performance.color 
                    }}
                  ></div>
                </div>
                <div className="progress-text">
                  {portfolio.metrics.completionRate}% Completion Rate
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredPortfolios.length === 0 && (
        <div className="no-results">
          <h3>No clients match your current filters</h3>
          <p>Try adjusting your filter criteria or date range</p>
        </div>
      )}
    </div>
  );
};

export default ClientPortfolioReport;