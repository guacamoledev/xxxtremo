import { traducirErrorFirebase } from '../utils/traducirErrorFirebase';
import React, { useState, useRef, useEffect } from 'react';
import { auth } from '../config/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import type { ConfirmationResult } from 'firebase/auth';
import logo from '/public/logo.png';
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
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  ListItemIcon,
} from '@mui/material';
// Ladas de países y banderas (puedes expandir la lista)
const countryCodes = [
  { code: '52', label: 'México', flag: '🇲🇽' },
  { code: '1', label: 'Estados Unidos', flag: '🇺🇸' },
  { code: '1', label: 'Canadá', flag: '🇨🇦' },
  { code: '54', label: 'Argentina', flag: '🇦🇷' },
  { code: '55', label: 'Brasil', flag: '🇧🇷' },
  { code: '57', label: 'Colombia', flag: '🇨🇴' },
  { code: '56', label: 'Chile', flag: '🇨🇱' },
  { code: '34', label: 'España', flag: '🇪🇸' },
  { code: '44', label: 'Reino Unido', flag: '🇬🇧' },
  { code: '49', label: 'Alemania', flag: '🇩🇪' },
  { code: '33', label: 'Francia', flag: '🇫🇷' },
  { code: '39', label: 'Italia', flag: '🇮🇹' },
  { code: '81', label: 'Japón', flag: '🇯🇵' },
  { code: '86', label: 'China', flag: '🇨🇳' },
  // ...agrega más si lo necesitas
];
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
    lada: '52',
    telefono: '',
    phone: '', // se sigue usando para el backend, pero se arma con lada+telefono
  });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [smsCode, setSmsCode] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handler específico para el Select de lada (MUI espera un tipo diferente)
  const handleLadaChange = (event: any) => {
    setFormData(prev => ({
      ...prev,
      lada: event.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword || !formData.birthdate || !formData.lada || !formData.telefono) {
      setError('Por favor completa todos los campos');
      return;
    }
    if (!/^[0-9]{10}$/.test(formData.telefono)) {
      setError('El teléfono debe tener exactamente 10 dígitos numéricos.');
      return;
    }
    if (!acceptTerms) {
      setError('Debes confirmar que tienes más de 18 años y aceptar los términos y condiciones');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (!/^\+[1-9]{1}[0-9]{7,14}$/.test(formData.phone)) {
      setError('Ingresa el número en formato internacional, ej: +521234567890');
      return;
    }
    if (!phoneVerified) {
      setError('Debes verificar tu número de teléfono por SMS');
      return;
    }
    try {
      setError('');
      setLoading(true);
      await register(formData.email, formData.password, formData.name, formData.phone, formData.birthdate);
      navigate('/dashboard');
    } catch (error: any) {
      setError('No se pudo crear la cuenta: ' + traducirErrorFirebase(error));
    } finally {
      setLoading(false);
    }
  };

  // Enviar SMS
  const sendVerificationCode = async () => {
    setError('');
    // Armar el teléfono internacional
    const phone = `+${formData.lada}${formData.telefono}`;
    if (!/^\+[1-9]{1}[0-9]{7,14}$/.test(phone)) {
      setError('Ingresa el número en formato internacional, ej: +521234567890');
      return;
    }
    formData.phone = phone;
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
      setError('Error enviando SMS: ' + traducirErrorFirebase(err));
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
      setSuccess('Teléfono verificado correctamente');
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
              <img src={logo} alt="XXXTREMO Logo" style={{ height: 'auto', verticalAlign: 'middle' }} />
              <Typography variant="h6" color="textSecondary">
                Crea tu cuenta
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            {success && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {success}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="name"
                label="Nombre completo"
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
                label="Fecha de nacimiento"
                name="birthdate"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={formData.birthdate}
                onChange={handleChange}
                disabled={loading}
              />
              <Box sx={{ display: 'flex', gap: 1, mb: 2, mt: 2, alignItems: 'center' }}>
                <FormControl required sx={{ width: '40%' }} disabled={loading || phoneVerified} size="small">
                  <InputLabel id="lada-label">País</InputLabel>
                  <Select
                    labelId="lada-label"
                    id="lada"
                    name="lada"
                    value={formData.lada}
                    label="Lada"
                    onChange={handleLadaChange}
                    renderValue={selected => {
                      const country = countryCodes.find(c => c.code === selected);
                      return country ? `${country.flag} +${country.code}` : selected;
                    }}
                    size="small"
                  >
                    {countryCodes.map((country, idx) => (
                      <MenuItem key={country.code + country.label + idx} value={country.code}>
                        <ListItemIcon sx={{ minWidth: 32 }}>{country.flag}</ListItemIcon>
                        {country.label} (+{country.code})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  required
                  label="Teléfono"
                  name="telefono"
                  id="telefono"
                  value={formData.telefono}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '');
                    setFormData(prev => ({ ...prev, telefono: val.slice(0, 10) }));
                  }}
                  inputProps={{ maxLength: 10, inputMode: 'numeric', pattern: '[0-9]*' }}
                  disabled={loading || phoneVerified}
                  sx={{ width: '60%', pb: '2px' }}
                  size="small"
                />
              </Box>
              <Box sx={{ my: 2 }}>
                <Button
                  onClick={sendVerificationCode}
                  disabled={loading || phoneVerified || !(formData.lada && formData.telefono.length === 10)}
                  variant="outlined"
                  fullWidth
                  sx={{ mb: confirmationResult && !phoneVerified ? 2 : 0 }}
                >
                  {phoneVerified ? 'Teléfono verificado' : 'Verificar teléfono por SMS'}
                </Button>
                <div ref={recaptchaContainerRef} id="recaptcha-container"></div>
                {confirmationResult && !phoneVerified && (
                  <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                      label="Código SMS"
                      value={smsCode}
                      onChange={e => setSmsCode(e.target.value)}
                      disabled={loading}
                      fullWidth
                    />
                    <Button
                      onClick={verifyCode}
                      disabled={loading || phoneVerified || !smsCode}
                      variant="contained"
                      fullWidth
                    >
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
                label="Correo electrónico"
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
                label="Contraseña"
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
                label="Confirmar contraseña"
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
                disabled={loading || !phoneVerified}
              >
                {loading ? <CircularProgress size={24} /> : 'Crear cuenta'}
              </Button>
              <Box sx={{ textAlign: 'center' }}>
                <Link component={RouterLink} to="/login" variant="body2">
                  {"¿Ya tienes cuenta? Inicia sesión"}
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
