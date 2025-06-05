// Chart color constants
export const CHART_COLORS = {
  pace: {
    border: '#F97316',
    background: 'rgba(249, 115, 22, 0.1)'
  },
  elevation: {
    border: '#059669',
    background: 'rgba(5, 150, 105, 0.1)'
  },
  heartRate: {
    border: '#DC2626',
    background: 'rgba(220, 38, 38, 0.1)'
  }
};

// Common chart configuration
const baseChartConfig = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      mode: 'index',
      intersect: false,
    },
  },
};

// Common X-axis configuration
const baseXAxisConfig = {
  grid: {
    display: false,
  },
  title: {
    display: true,
    text: 'Distance (km)'
  },
  ticks: {
    maxTicksLimit: 10,
    callback: function(value, index, values) {
      const label = this.getLabelForValue(value);
      return label === '' ? '' : label;
    }
  }
};

// Common Y-axis configuration
const baseYAxisConfig = {
  grid: {
    color: '#e5e7eb',
  },
};

// Pace chart configuration factory
export const createPaceChartOptions = (paceData) => ({
  ...baseChartConfig,
  scales: {
    x: baseXAxisConfig,
    y: {
      ...baseYAxisConfig,
      title: {
        display: true,
        text: 'Pace (min/km)'
      },
      beginAtZero: false,
      reverse: true, // Invert y-axis: faster pace (lower values) at top
      min: Math.max(2, Math.min(...paceData.datasets[0].data) - 0.5),
      max: Math.max(...paceData.datasets[0].data) + 0.5,
      ticks: {
        stepSize: 0.5,
      }
    },
  },
  plugins: {
    ...baseChartConfig.plugins,
    tooltip: {
      ...baseChartConfig.plugins.tooltip,
      callbacks: {
        label: function(context) {
          return `Pace: ${context.parsed.y.toFixed(1)} min/km`;
        }
      }
    },
  },
});

// Elevation chart configuration
export const elevationChartOptions = {
  ...baseChartConfig,
  scales: {
    x: baseXAxisConfig,
    y: {
      ...baseYAxisConfig,
      title: {
        display: true,
        text: 'Elevation (m)'
      },
      beginAtZero: true,
    },
  },
  plugins: {
    ...baseChartConfig.plugins,
    tooltip: {
      ...baseChartConfig.plugins.tooltip,
      callbacks: {
        label: function(context) {
          return `Elevation: ${Math.round(context.parsed.y)}m`;
        }
      }
    },
  },
};

// Heart rate chart configuration
export const heartRateChartOptions = {
  ...baseChartConfig,
  scales: {
    x: {
      ...baseXAxisConfig,
      title: {
        display: true,
        text: 'Kilometer'
      }
    },
    y: {
      ...baseYAxisConfig,
      title: {
        display: true,
        text: 'Heart Rate (bpm)'
      },
      beginAtZero: false,
      min: 60,
      max: 200,
    },
  },
  plugins: {
    ...baseChartConfig.plugins,
    tooltip: {
      ...baseChartConfig.plugins.tooltip,
      callbacks: {
        label: function(context) {
          return `Heart Rate: ${Math.round(context.parsed.y)} bpm`;
        }
      }
    },
  },
};

// Dataset configuration helpers
export const createDatasetConfig = (type, data, label) => ({
  label,
  data,
  borderColor: CHART_COLORS[type].border,
  backgroundColor: CHART_COLORS[type].background,
  tension: 0.4,
  fill: true,
});