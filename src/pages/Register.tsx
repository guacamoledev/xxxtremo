import React, { useState, useRef, useEffect } from 'react';
import { auth } from '../config/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import type { ConfirmationResult } from 'firebase/auth';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Link,
  CircularProgress,
  Container,
} from '@mui/material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Register: React.FC = () => {
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!(window as any).recaptchaVerifier && recaptchaContainerRef.current) {
      // Correct argument order: (auth, 'recaptcha-container', options)
      (window as any).recaptchaVerifier = new RecaptchaVerifier(
        auth,
        'recaptcha-container',
        { size: 'invisible' }
      );
    }
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    birthdate: '',
    phone: '',
  });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [smsCode, setSmsCode] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword || !formData.birthdate || !formData.phone) {
      setError('Please fill in all fields');
      return;
    }
    if (!acceptTerms) {
      setError('You must confirm you are over 18 and accept the terms and conditions');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (!/^\+[1-9]{1}[0-9]{7,14}$/.test(formData.phone)) {
      setError('Ingresa el número en formato internacional, ej: +521234567890');
      return;
    }
    if (!phoneVerified) {
      setError('You must verify your phone number via SMS');
      return;
    }
    try {
      setError('');
      setLoading(true);
      await register(formData.email, formData.password, formData.name, formData.phone, formData.birthdate);
      navigate('/dashboard');
    } catch (error: any) {
      setError('Failed to create account: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // Enviar SMS
  const sendVerificationCode = async () => {
    setError('');
    if (!/^[+][1-9]{1}[0-9]{7,14}$/.test(formData.phone)) {
      setError('Ingresa el número en formato internacional, ej: +521234567890');
      return;
    }
    try {
      setLoading(true);
      let recaptcha: RecaptchaVerifier = (window as any).recaptchaVerifier;
      if (!recaptcha) {
        recaptcha = new RecaptchaVerifier(
          auth,
          'recaptcha-container',
          { size: 'invisible' }
        );
        (window as any).recaptchaVerifier = recaptcha;
      }
      await recaptcha.render(); // Ensure recaptcha is rendered
      const result = await signInWithPhoneNumber(auth, formData.phone, recaptcha);
      setConfirmationResult(result);
      setError('Código enviado por SMS. Ingresa el código para verificar tu número.');
    } catch (err: any) {
      setError('Error enviando SMS: ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  };

  // Verificar código SMS
  const verifyCode = async () => {
    if (!confirmationResult) return;
    try {
      setLoading(true);
      await confirmationResult.confirm(smsCode);
      setPhoneVerified(true);
      setError('Teléfono verificado correctamente');
    } catch (err: any) {
      setError('Código incorrecto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <Card sx={{ mt: 8, width: '100%', maxWidth: 400 }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
              <Typography component="h1" variant="h4" sx={{ color: 'primary.main', fontWeight: 'bold', mb: 1 }}>
                XXXTREMO
              </Typography>
              <Typography variant="h6" color="textSecondary">
                Create your account
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="name"
                label="Full Name"
                name="name"
                autoComplete="name"
                autoFocus
                value={formData.name}
                onChange={handleChange}
                disabled={loading}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                id="birthdate"
                label="Birthdate"
                name="birthdate"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={formData.birthdate}
                onChange={handleChange}
                disabled={loading}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                id="phone"
                label="Número de celular (incluye clave lada, ej: +521234567890)"
                name="phone"
                type="tel"
                inputProps={{ maxLength: 16, pattern: '^\\+[1-9]{1}[0-9]{7,14}$' }}
                value={formData.phone}
                onChange={handleChange}
                disabled={loading || phoneVerified}
                placeholder="+521234567890"
              />
              <Box sx={{ my: 2 }}>
                <Button onClick={sendVerificationCode} disabled={loading || phoneVerified || !formData.phone} variant="outlined">
                  {phoneVerified ? 'Teléfono verificado' : 'Verificar teléfono por SMS'}
                </Button>
                <div ref={recaptchaContainerRef} id="recaptcha-container"></div>
                {confirmationResult && !phoneVerified && (
                  <Box sx={{ mt: 2 }}>
                    <TextField
                      label="Código SMS"
                      value={smsCode}
                      onChange={e => setSmsCode(e.target.value)}
                      disabled={loading}
                    />
                    <Button onClick={verifyCode} disabled={loading || phoneVerified || !smsCode} sx={{ ml: 2 }} variant="contained">
                      Confirmar código
                    </Button>
                  </Box>
                )}
              </Box>
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="password"
                autoComplete="new-password"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="confirmPassword"
                label="Confirm Password"
                type="password"
                id="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={loading}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, mb: 1 }}>
                <input
                  type="checkbox"
                  id="acceptTerms"
                  checked={acceptTerms}
                  onChange={e => setAcceptTerms(e.target.checked)}
                  disabled={loading}
                  style={{ marginRight: 8 }}
                  required
                />
                <label htmlFor="acceptTerms" style={{ fontSize: 14 }}>
                  Confirmo que tengo más de 18 años y acepto los{' '}
                  <Link href="/terms" target="_blank" rel="noopener" underline="always">
                    términos y condiciones
                  </Link>
                </label>
              </Box>
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 2, mb: 2, py: 1.5 }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Sign Up'}
              </Button>
              <Box sx={{ textAlign: 'center' }}>
                <Link component={RouterLink} to="/login" variant="body2">
                  {"Already have an account? Sign In"}
                </Link>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default Register;
