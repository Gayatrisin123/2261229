
import React, { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Container, Typography, Card, CardContent, Box, CircularProgress, Alert } from '@mui/material';
import { URLService } from '../services/URLService';
import { LoggingService } from '../services/LoggingService';

const RedirectHandler = () => {
  const { shortCode } = useParams<{ shortCode: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  useEffect(() => {
    const handleRedirect = async () => {
      if (!shortCode) {
        setError('Invalid short URL');
        setIsLoading(false);
        return;
      }

      LoggingService.log('Redirect request received', { shortCode });

      try {
        const url = URLService.getUrlByShortCode(shortCode);
        
        if (!url) {
          LoggingService.warning('Short code not found', { shortCode });
          setError('Short URL not found');
          setIsLoading(false);
          return;
        }

        // Check if URL has expired
        if (new Date() > url.expiresAt) {
          LoggingService.warning('URL has expired', { shortCode, expiresAt: url.expiresAt });
          setError('This short URL has expired');
          setIsLoading(false);
          return;
        }

        // Record the click
        const clickRecorded = URLService.recordClick(
          shortCode, 
          document.referrer || 'direct',
          'web'
        );

        if (clickRecorded) {
          LoggingService.log('Click recorded and redirecting', { 
            shortCode, 
            originalUrl: url.originalUrl 
          });
          
          // Small delay to ensure click is recorded
          setTimeout(() => {
            setRedirectUrl(url.originalUrl);
            setIsLoading(false);
          }, 500);
        } else {
          LoggingService.error('Failed to record click', { shortCode });
          setError('Failed to process redirect');
          setIsLoading(false);
        }
      } catch (error) {
        LoggingService.error('Redirect handler error', { 
          shortCode, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        setError('An error occurred while processing the redirect');
        setIsLoading(false);
      }
    };

    handleRedirect();
  }, [shortCode]);

  // Redirect to the original URL
  if (redirectUrl) {
    window.location.href = redirectUrl;
    return null;
  }

  // Show error page
  if (error) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h4" color="error" gutterBottom>
              Redirect Error
            </Typography>
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
            <Typography variant="body1" color="text.secondary">
              The short URL you're trying to access is either invalid, expired, or has been removed.
            </Typography>
          </CardContent>
        </Card>
      </Container>
    );
  }

  // Show loading state
  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress size={60} sx={{ mb: 3 }} />
          <Typography variant="h5" gutterBottom>
            Redirecting...
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Please wait while we redirect you to the original URL.
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
};

export default RedirectHandler;
