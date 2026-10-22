import { useState } from 'react';
import { Alert, Box, Button, Link, Paper, TextField, Typography} from '@mui/material';
import { useAuth } from '../../context/AuthContext.jsx';
import SignUpForm from './SignUpForm.jsx';
import ColorModeToggle from '../common/ColorModeToggle.jsx';


function LoginForm (){
    const {login} = useAuth();
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState(null)
    const [mode, setMode] = useState('login')

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError(null);
        try{
            await login(email, password);
        } catch (e){
            if (e.response?.status === 401){
                setError('Incorrect Email or password')
            }else if (e.response?.status === 403){
                setError(e.response.data?.detail ?? 'This account has been deactivated.')
            }else{
                setError('Something when wrong')
                console.log(e)
            }
        }

    };

    const handleDemo = async (e) => {
        e.preventDefault()
        setError(null)
        setEmail('demo')
        setPassword('DemoPass123!')
        try{
            await login(email, password);
        } catch (e){
            setError(e.response?.data)
        }
    }

    if (mode === 'signup'){
        return (
            <Box sx={{display: 'flex', justifyContent: 'center', mt: 8, px: 2}}>
                <ColorModeToggle sx={{position: 'fixed', top: 16, right: 16}} />
                <SignUpForm onShowLogin={() => setMode('login')} />
            </Box>
        )
    }

    return(
        <Box sx={{display: 'flex', justifyContent: 'center', mt: 8, px: 2}}>
            <ColorModeToggle sx={{position: 'fixed', top: 16, right: 16}} />
            <Paper component='form' onSubmit={handleSubmit} variant='outlined' sx={{p:4, width: 320, maxWidth: '100%'}}>
                <Typography variant='h6' gutterBottom>
                    ACME Facilities Desk
                </Typography>
                {error && <Alert severity='error' sx={{mb:2}}>{error}</Alert>}
                <TextField
                    label= 'Email'
                    fullWidth
                    margin='normal'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}/>
                <TextField
                    label= 'Password'
                    type='password'
                    fullWidth
                    margin='normal'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}/>
                <Button type='submit' variant='contained' fullWidth sx={{mt:2}}>
                    Log-In
                </Button>
                <Typography variant='body2' sx={{mt: 2, textAlign: 'center'}}>
                    New to ACME Facilities Desk?{' '}
                    <Link component='button' type='button' onClick={() => { setError(null); setMode('signup') }}>Create an account</Link>
                </Typography>
                
            </Paper>

        </Box>
    )
}

export default LoginForm;