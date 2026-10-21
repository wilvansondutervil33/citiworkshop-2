import { useState } from 'react';
import { Alert, Box, Button, Paper, TextField, Typography} from '@mui/material';
import { useAuth } from '../../context/AuthContext.jsx';


function LoginForm (){
    const {login} = useAuth();
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState(null)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError(null);
        try{
            await login(email, password);
        } catch (e){
            if (e.response?.status === 401){
                setError('Incorrect Email or password')
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

    return(
        <Box sx={{display: 'flex', justifyContent: 'center', mt: 8}}>
            <Paper component='form' onSubmit={handleSubmit} variant='outline' sx={{p:4, width: 320}}>
                <Typography variant='h6' gutterBottom>
                    MedFlow Login
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
                
            </Paper>

        </Box>
    )
}

export default LoginForm;