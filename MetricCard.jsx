import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  InfoOutlined,
  Refresh,
} from '@mui/icons-material';

const MetricCard = ({
  title,
  value,
  icon,
  color = '#3b82f6',
  trend = 'up',
  trendValue,
  subtitle,
  loading = false,
  progressValue,
  maxValue,
  unit,
  infoTooltip,
  onRefresh,
  onClick,
}) => {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp sx={{ color: '#10b981', fontSize: 16 }} />;
      case 'down':
        return <TrendingDown sx={{ color: '#ef4444', fontSize: 16 }} />;
      default:
        return <TrendingFlat sx={{ color: '#6b7280', fontSize: 16 }} />;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return '#10b981';
      case 'down':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const formatValue = (val) => {
    if (typeof val === 'number') {
      if (val >= 1000000) {
        return `${(val / 1000000).toFixed(1)}M`;
      }
      if (val >= 1000) {
        return `${(val / 1000).toFixed(1)}K`;
      }
      return val.toLocaleString();
    }
    return val;
  };

  return (
    <motion.div
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        onClick={onClick}
        sx={{
          height: '100%',
          cursor: onClick ? 'pointer' : 'default',
          transition: 'all 0.3s',
          '&:hover': {
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
          },
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: `linear-gradient(135deg, ${color} 0%, ${color}80 100%)`,
          },
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  bgcolor: `${color}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: color,
                }}
              >
                {icon}
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 500 }}>
                  {title}
                </Typography>
                {infoTooltip && (
                  <Tooltip title={infoTooltip} arrow>
                    <InfoOutlined sx={{ fontSize: 14, color: 'text.secondary', ml: 0.5 }} />
                  </Tooltip>
                )}
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {onRefresh && (
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRefresh();
                  }}
                  disabled={loading}
                >
                  <Refresh sx={{ fontSize: 16 }} />
                </IconButton>
              )}
            </Box>
          </Box>

          <Box sx={{ mb: 2 }}>
            {loading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Box sx={{ height: 36, bgcolor: 'grey.200', borderRadius: 1 }} />
                </Box>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <Typography variant="h3" fontWeight="bold" sx={{ color }}>
                  {formatValue(value)}
                </Typography>
                {unit && (
                  <Typography variant="body2" color="text.secondary">
                    {unit}
                  </Typography>
                )}
              </Box>
            )}
          </Box>

          {subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {subtitle}
            </Typography>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {trendValue && (
              <Chip
                icon={getTrendIcon()}
                label={trendValue}
                size="small"
                sx={{
                  bgcolor: `${getTrendColor()}20`,
                  color: getTrendColor(),
                  fontWeight: 500,
                  fontSize: '0.75rem',
                }}
              />
            )}

            {progressValue !== undefined && maxValue && (
              <Box sx={{ flexGrow: 1, ml: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    Progression
                  </Typography>
                  <Typography variant="caption" fontWeight="bold">
                    {Math.round((progressValue / maxValue) * 100)}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={(progressValue / maxValue) * 100}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    bgcolor: 'grey.200',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: color,
                      borderRadius: 3,
                    },
                  }}
                />
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default MetricCard;