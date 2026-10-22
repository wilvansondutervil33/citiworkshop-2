import { useState } from 'react';
import { Alert, Box, Button, Link, Paper, TextField, Typography } from '@mui/material';
import { useAuth } from '../../context/AuthContext.jsx';
import { apiErrorMessage } from '../../utils/tickets';
import { PASSWORD_HINT, passwordProblem } from '../../utils/password';

// The API stores one name field (2 to 25 characters), so first and last are joined on submit
const fullName = (form) => `${form.firstName.trim()} ${form.lastName.trim()}`.trim();

// Mirrors the API's sign-up rules so mistakes show before submitting
function validate(form) {
    const errors = {};
    if (!form.firstName.trim()) errors.firstName = 'Enter your first name.';
    if (!form.lastName.trim()) errors.lastName = 'Enter your last name.';
    if (!errors.firstName && !errors.lastName && fullName(form).length > 25) {
        errors.lastName = `First and last name together can be at most 25 characters (now ${fullName(form).length}).`;
    }
    if (!/^[^\s@]+@acme\.inc$/i.test(form.email.trim())) errors.email = 'Use your @acme.inc work email.';
    const passwordError = passwordProblem(form.password);
    if (passwordError) errors.password = passwordError;
    if (form.confirm !== form.password) errors.confirm = "Passwords don't match.";
    return errors;
}

function SignUpForm({ onShowLogin }) {
    const { signup } = useAuth();
    const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirm: '' });
    const [touched, setTouched] = useState(false);
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const errors = validate(form);
    const fieldError = (field) => (touched ? errors[field] : undefined);
    const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setTouched(true);
        setError(null);
        if (Object.keys(errors).length) return;
        setSubmitting(true);
        try {
            await signup(fullName(form), form.email.trim().toLowerCase(), form.password);
        } catch (err) {
            setError(apiErrorMessage(err));
            setSubmitting(false);
        }
    };

    return (
        <Paper component='form' onSubmit={handleSubmit} noValidate variant='outlined' sx={{ p: 4, width: 360, maxWidth: '100%' }}>
            <Typography variant='h6'>Create an account</Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
                For ACME employees reporting facility issues. Engineers and admins are added by a facility admin.
            </Typography>
            {error && <Alert severity='error' sx={{ my: 1 }}>{error}</Alert>}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, columnGap: 1.5 }}>
                <TextField id='signup-first-name' label='First name' fullWidth margin='normal' autoComplete='given-name'
                    value={form.firstName} onChange={set('firstName')}
                    error={Boolean(fieldError('firstName'))} helperText={fieldError('firstName')} />
                <TextField id='signup-last-name' label='Last name' fullWidth margin='normal' autoComplete='family-name'
                    value={form.lastName} onChange={set('lastName')}
                    error={Boolean(fieldError('lastName'))} helperText={fieldError('lastName')} />
            </Box>
            <TextField id='signup-email' label='Work email' type='email' placeholder='first.last@acme.inc' fullWidth margin='normal'
                value={form.email} onChange={set('email')} error={Boolean(fieldError('email'))} helperText={fieldError('email')} />
            <TextField id='signup-password' label='Password' type='password' fullWidth margin='normal' autoComplete='new-password'
                value={form.password} onChange={set('password')} error={Boolean(fieldError('password'))}
                helperText={fieldError('password') ?? PASSWORD_HINT} />
            <TextField id='signup-confirm' label='Confirm password' type='password' fullWidth margin='normal' autoComplete='new-password'
                value={form.confirm} onChange={set('confirm')} error={Boolean(fieldError('confirm'))} helperText={fieldError('confirm')} />
            <Button type='submit' variant='contained' fullWidth disabled={submitting} sx={{ mt: 2 }}>
                {submitting ? 'Creating account…' : 'Create account'}
            </Button>
            <Typography variant='body2' sx={{ mt: 2, textAlign: 'center' }}>
                Already have an account?{' '}
                <Link component='button' type='button' onClick={onShowLogin}>Log in</Link>
            </Typography>
        </Paper>
    );
}

export default SignUpForm;
