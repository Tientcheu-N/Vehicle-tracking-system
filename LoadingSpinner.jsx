import React from 'react';
import { Box, CircularProgress, Typography, keyframes } from '@mui/material';
import { motion } from 'framer-motion';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';

const pulse = keyframes`
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.7; }
  100% { transform: scale(1); opacity: 1; }
`;

const LoadingSpinner = ({ 
  message = 'Chargement...',
  fullScreen = false,
  size = 40,
  color = 'primary',
  withBus = true 
}) => {
  const content = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        p: 4,
      }}
    >
      {withBus && (
        <motion.div
          animate={{
            y: [0, -10, 0],
            rotate: [0, 5, 0, -5, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{ display: 'flex', alignItems: 'center' }}
        >
          <DirectionsBusIcon 
            sx={{ 
              fontSize: 60, 
              color: `${color}.main`,
              animation: `${pulse} 2s infinite`,
            }} 
          />
        </motion.div>
      )}
      
      <CircularProgress 
        size={size} 
        color={color}
        thickness={4}
        sx={{
          '& .MuiCircularProgress-circle': {
            strokeLinecap: 'round',
          },
        }}
      />
      
      {message && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Typography 
            variant="body1" 
            color="text.secondary"
            sx={{ mt: 2, fontWeight: 500 }}
          >
            {message}
          </Typography>
          <Typography 
            variant="caption" 
            color="text.secondary"
            sx={{ display: 'block', mt: 0.5 }}
          >
            Veuillez patienter...
          </Typography>
        </motion.div>
      )}
      
      <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: `${color}.main`,
              }}
            />
          </motion.div>
        ))}
      </Box>
    </Box>
  );

  if (fullScreen) {
    return (
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.paper',
          zIndex: 9999,
        }}
      >
        {content}
      </Box>
    );
  }

  return content;
};

export const LoadingOverlay = ({ isLoading, children }) => {
  if (!isLoading) return children;

  return (
    <Box sx={{ position: 'relative', minHeight: 200 }}>
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(4px)',
          zIndex: 10,
          borderRadius: 2,
        }}
      >
        <LoadingSpinner />
      </Box>
      {children}
    </Box>
  );
};

export const LoadingSkeleton = ({ lines = 3, height = 20 }) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2 }}>
      {Array.from({ length: lines }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0.5 }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: index * 0.2,
          }}
        >
          <Box
            sx={{
              height,
              bgcolor: 'grey.200',
              borderRadius: 1,
              width: index === 0 ? '80%' : index === 1 ? '60%' : '40%',
            }}
          />
        </motion.div>
      ))}
    </Box>
  );
};

export default LoadingSpinner;