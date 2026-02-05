import React from 'react';
import {
  Box,
  Container,
  Grid,
  Typography,
  Link,
  IconButton,
  Divider,
  Stack,
  Paper,
} from '@mui/material';
import {
  DirectionsBus,
  Facebook,
  Twitter,
  Instagram,
  LinkedIn,
  Email,
  Phone,
  LocationOn,
  ArrowUpward,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const Footer = () => {
  const navigate = useNavigate();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const footerLinks = {
    'Navigation': [
      { label: 'Tableau de bord', path: '/dashboard' },
      { label: 'Suivi en direct', path: '/tracking' },
      { label: 'Planifier un trajet', path: '/routes' },
      { label: 'Chauffeurs', path: '/drivers' },
      { label: 'Villes', path: '/cities' },
    ],
    'Services': [
      { label: 'Transport urbain', path: '/services/urban' },
      { label: 'Transport interurbain', path: '/services/interurban' },
      { label: 'Livraison', path: '/services/delivery' },
      { label: 'Location', path: '/services/rental' },
      { label: 'Tourisme', path: '/services/tourism' },
    ],
    'Ressources': [
      { label: 'Documentation API', path: '/api-docs' },
      { label: 'Centre d\'aide', path: '/help' },
      { label: 'Blog', path: '/blog' },
      { label: 'Presse', path: '/press' },
      { label: 'Carrières', path: '/careers' },
    ],
    'Légal': [
      { label: 'Conditions d\'utilisation', path: '/terms' },
      { label: 'Politique de confidentialité', path: '/privacy' },
      { label: 'Cookies', path: '/cookies' },
      { label: 'Accessibilité', path: '/accessibility' },
      { label: 'Mentions légales', path: '/legal' },
    ],
  };

  const socialLinks = [
    { icon: <Facebook />, label: 'Facebook', url: 'https://facebook.com/smarttransitcm' },
    { icon: <Twitter />, label: 'Twitter', url: 'https://twitter.com/smarttransitcm' },
    { icon: <Instagram />, label: 'Instagram', url: 'https://instagram.com/smarttransitcm' },
    { icon: <LinkedIn />, label: 'LinkedIn', url: 'https://linkedin.com/company/smarttransitcm' },
  ];

  return (
    <Box
      component="footer"
      sx={{
        bgcolor: 'grey.900',
        color: 'white',
        pt: 6,
        pb: 4,
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
        },
      }}
    >
      {/* Background pattern */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(37, 99, 235, 0.1) 0%, transparent 55%), radial-gradient(circle at 75% 75%, rgba(124, 58, 237, 0.1) 0%, transparent 55%)',
          pointerEvents: 'none',
        }}
      />

      <Container maxWidth="xl">
        <Grid container spacing={4}>
          {/* Logo and description */}
          <Grid item xs={12} md={4}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <DirectionsBus sx={{ fontSize: 40, color: 'primary.main' }} />
                <Typography variant="h5" fontWeight="bold">
                  Smart Transit Cameroon
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ mb: 3, color: 'grey.300', lineHeight: 1.7 }}>
                Le système de transport intelligent qui révolutionne les déplacements au Cameroun.
                Connectez-vous, déplacez-vous, vivez mieux.
              </Typography>
              
              <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
                {socialLinks.map((social, index) => (
                  <motion.div
                    key={index}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <IconButton
                      component="a"
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                        color: 'white',
                        '&:hover': {
                          bgcolor: 'primary.main',
                        },
                      }}
                      aria-label={social.label}
                    >
                      {social.icon}
                    </IconButton>
                  </motion.div>
                ))}
              </Stack>
            </motion.div>
          </Grid>

          {/* Links columns */}
          {Object.entries(footerLinks).map(([category, links], colIndex) => (
            <Grid item xs={6} md={2} key={category}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: colIndex * 0.1 }}
              >
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 3, color: 'primary.light' }}>
                  {category}
                </Typography>
                <Stack spacing={1.5}>
                  {links.map((link, index) => (
                    <Link
                      key={index}
                      component="button"
                      onClick={() => navigate(link.path)}
                      sx={{
                        color: 'grey.300',
                        textDecoration: 'none',
                        textAlign: 'left',
                        '&:hover': {
                          color: 'primary.main',
                        },
                        transition: 'color 0.2s',
                      }}
                    >
                      {link.label}
                    </Link>
                  ))}
                </Stack>
              </motion.div>
            </Grid>
          ))}
        </Grid>

        <Divider sx={{ my: 4, bgcolor: 'grey.700' }} />

        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={6}>
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              <Stack direction="row" spacing={4} flexWrap="wrap">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Email fontSize="small" />
                  <Typography variant="body2" color="grey.300">
                    contact@smarttransit.cm
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Phone fontSize="small" />
                  <Typography variant="body2" color="grey.300">
                    +237 6XX XX XX XX
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LocationOn fontSize="small" />
                  <Typography variant="body2" color="grey.300">
                    Yaoundé, Cameroun
                  </Typography>
                </Box>
              </Stack>
            </motion.div>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' }, alignItems: 'center', gap: 3 }}>
              <Typography variant="body2" color="grey.300">
                © {new Date().getFullYear()} Smart Transit Cameroon. Tous droits réservés.
              </Typography>
              
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <IconButton
                  onClick={scrollToTop}
                  sx={{
                    bgcolor: 'primary.main',
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'primary.dark',
                    },
                  }}
                  aria-label="Remonter en haut"
                >
                  <ArrowUpward />
                </IconButton>
              </motion.div>
            </Box>
          </Grid>
        </Grid>

        {/* Stats banner */}
        <Paper
          elevation={0}
          sx={{
            mt: 4,
            p: 3,
            bgcolor: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 3,
            backdropFilter: 'blur(10px)',
          }}
        >
          <Grid container spacing={3} justifyContent="center">
            {[
              { value: '19', label: 'Villes connectées' },
              { value: '500+', label: 'Chauffeurs actifs' },
              { value: '24/7', label: 'Service' },
              { value: '99.9%', label: 'Satisfaction' },
              { value: '45ms', label: 'Temps de réponse' },
            ].map((stat, index) => (
              <Grid item key={index}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight="bold" color="primary.main">
                    {stat.value}
                  </Typography>
                  <Typography variant="body2" color="grey.300">
                    {stat.label}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Paper>
      </Container>
    </Box>
  );
};

export default Footer;