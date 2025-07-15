import React, { useState } from "react";
import {
  Container,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Box,
  Alert,
  Chip,
  IconButton,
  Grid,
  Paper,
  Divider,
} from "@mui/material";
import {
  ContentCopy,
  Delete,
  Add,
  Analytics,
  Link as LinkIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { URLService } from "../services/URLService";
import { LoggingService } from "../services/LoggingService";

interface URLEntry {
  id: string;
  originalUrl: string;
  validity: number;
  customShortcode?: string;
}

interface ShortenedURL {
  id: string;
  originalUrl: string;
  shortCode: string;
  shortUrl: string;
  validity: number;
  createdAt: Date;
  expiresAt: Date;
}

const Index = () => {
  const navigate = useNavigate();
  const [urlEntries, setUrlEntries] = useState<URLEntry[]>([
    { id: "1", originalUrl: "", validity: 30, customShortcode: "" },
  ]);
  const [shortenedUrls, setShortenedUrls] = useState<ShortenedURL[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const addUrlEntry = () => {
    if (urlEntries.length < 5) {
      const newEntry: URLEntry = {
        id: Date.now().toString(),
        originalUrl: "",
        validity: 30,
        customShortcode: "",
      };
      setUrlEntries([...urlEntries, newEntry]);
      LoggingService.log("URL entry added", {
        totalEntries: urlEntries.length + 1,
      });
    }
  };

  const removeUrlEntry = (id: string) => {
    setUrlEntries(urlEntries.filter((entry) => entry.id !== id));
    LoggingService.log("URL entry removed", { entryId: id });
  };

  const updateUrlEntry = (
    id: string,
    field: keyof URLEntry,
    value: string | number
  ) => {
    setUrlEntries(
      urlEntries.map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry
      )
    );
    // Clear error when user starts typing
    if (errors[`${id}-${field}`]) {
      setErrors((prev) => ({ ...prev, [`${id}-${field}`]: "" }));
    }
  };

  const validateUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const validateInputs = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    let isValid = true;

    urlEntries.forEach((entry) => {
      if (!entry.originalUrl.trim()) {
        newErrors[`${entry.id}-originalUrl`] = "URL is required";
        isValid = false;
      } else if (!validateUrl(entry.originalUrl)) {
        newErrors[`${entry.id}-originalUrl`] = "Please enter a valid URL";
        isValid = false;
      }

      if (entry.validity < 1) {
        newErrors[`${entry.id}-validity`] =
          "Validity must be at least 1 minute";
        isValid = false;
      }

      if (entry.customShortcode && entry.customShortcode.length < 3) {
        newErrors[`${entry.id}-customShortcode`] =
          "Custom shortcode must be at least 3 characters";
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleShortenUrls = async () => {
    if (!validateInputs()) {
      toast.error("Please fix the validation errors");
      return;
    }

    setIsLoading(true);
    LoggingService.log("URL shortening started", {
      urlCount: urlEntries.length,
    });

    try {
      const results: ShortenedURL[] = [];

      for (const entry of urlEntries) {
        if (entry.originalUrl.trim()) {
          const result = URLService.shortenUrl(
            entry.originalUrl,
            entry.validity,
            entry.customShortcode
          );
          results.push(result);
        }
      }

      setShortenedUrls(results);
      toast.success(
        `Successfully shortened ${results.length} URL${
          results.length > 1 ? "s" : ""
        }!`
      );
      LoggingService.log("URLs shortened successfully", {
        count: results.length,
      });
    } catch (error) {
      toast.error("Failed to shorten URLs. Please try again.");
      LoggingService.log("URL shortening failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
    LoggingService.log("URL copied to clipboard", { url: text });
  };

  const handleReset = () => {
    setUrlEntries([
      { id: "1", originalUrl: "", validity: 30, customShortcode: "" },
    ]);
    setShortenedUrls([]);
    setErrors({});
    LoggingService.log("Form reset");
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ textAlign: "center", mb: 4 }}>
        <Typography
          variant="h3"
          component="h1"
          gutterBottom
          sx={{ fontWeight: 700, color: "primary.main" }}
        >
          URL Shortener
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
          Shorten up to 5 URLs at once with custom options and analytics
        </Typography>

        <Button
          variant="outlined"
          startIcon={<Analytics />}
          onClick={() => navigate("/statistics")}
          sx={{ mr: 2 }}
        >
          View Statistics
        </Button>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography
                variant="h5"
                gutterBottom
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                <LinkIcon color="primary" />
                Create Short URLs
              </Typography>

              {urlEntries.map((entry, index) => (
                <Box key={entry.id} sx={{ mb: 3 }}>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                    <Chip
                      label={`URL ${index + 1}`}
                      color="primary"
                      variant="outlined"
                      size="small"
                    />
                    {urlEntries.length > 1 && (
                      <IconButton
                        onClick={() => removeUrlEntry(entry.id)}
                        size="small"
                        sx={{ ml: 1 }}
                      >
                        <Delete />
                      </IconButton>
                    )}
                  </Box>

                  <TextField
                    fullWidth
                    label="Original URL"
                    value={entry.originalUrl}
                    onChange={(e) =>
                      updateUrlEntry(entry.id, "originalUrl", e.target.value)
                    }
                    error={!!errors[`${entry.id}-originalUrl`]}
                    helperText={errors[`${entry.id}-originalUrl`]}
                    placeholder="https://example.com"
                    sx={{ mb: 2 }}
                  />

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Validity (minutes)"
                        type="number"
                        value={entry.validity}
                        onChange={(e) =>
                          updateUrlEntry(
                            entry.id,
                            "validity",
                            parseInt(e.target.value) || 30
                          )
                        }
                        error={!!errors[`${entry.id}-validity`]}
                        helperText={
                          errors[`${entry.id}-validity`] ||
                          "Default: 30 minutes"
                        }
                        inputProps={{ min: 1 }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Custom Shortcode (optional)"
                        value={entry.customShortcode}
                        onChange={(e) =>
                          updateUrlEntry(
                            entry.id,
                            "customShortcode",
                            e.target.value
                          )
                        }
                        error={!!errors[`${entry.id}-customShortcode`]}
                        helperText={
                          errors[`${entry.id}-customShortcode`] ||
                          "Min 3 characters"
                        }
                        placeholder="my-link"
                      />
                    </Grid>
                  </Grid>

                  {index < urlEntries.length - 1 && <Divider sx={{ mt: 2 }} />}
                </Box>
              ))}

              <Box sx={{ display: "flex", gap: 2, mt: 3 }}>
                {urlEntries.length < 5 && (
                  <Button
                    variant="outlined"
                    startIcon={<Add />}
                    onClick={addUrlEntry}
                  >
                    Add URL
                  </Button>
                )}

                <Button
                  variant="contained"
                  onClick={handleShortenUrls}
                  disabled={isLoading}
                  sx={{ flex: 1 }}
                >
                  {isLoading ? "Shortening..." : "Shorten URLs"}
                </Button>

                <Button
                  variant="outlined"
                  onClick={handleReset}
                  disabled={isLoading}
                >
                  Reset
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Shortened URLs
              </Typography>

              {shortenedUrls.length === 0 ? (
                <Alert severity="info">
                  Your shortened URLs will appear here after creation.
                </Alert>
              ) : (
                <Box>
                  {shortenedUrls.map((url) => (
                    <Paper
                      key={url.id}
                      sx={{ p: 2, mb: 2, bgcolor: "grey.50" }}
                    >
                      <Typography
                        variant="subtitle2"
                        color="primary"
                        gutterBottom
                      >
                        Original URL:
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ mb: 1, wordBreak: "break-all" }}
                      >
                        {url.originalUrl}
                      </Typography>

                      <Typography
                        variant="subtitle2"
                        color="primary"
                        gutterBottom
                      >
                        Short URL:
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          mb: 2,
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{ flex: 1, fontFamily: "monospace" }}
                        >
                          {url.shortUrl}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => copyToClipboard(url.shortUrl)}
                        >
                          <ContentCopy fontSize="small" />
                        </IconButton>
                      </Box>

                      <Typography variant="caption" color="text.secondary">
                        Expires: {url.expiresAt.toLocaleString()}
                      </Typography>
                    </Paper>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Index;
