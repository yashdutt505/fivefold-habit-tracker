'use client';
import {useEffect,useState} from 'react';
import {ThemeToggle} from '../theme';
export default function Login(){
 const [message,setMessage]=useState('');
 useEffect(()=>{const q=new URLSearchParams(location.search);if(q.has('deleted'))setMessage('Your account and habit history have been deleted.');if(q.has('error'))setMessage('Sign-in could not be completed. Please try again.');},[]);
 return <main className="shell auth-page"><div className="topbar"><a className="brand" href="/">fivefold</a><ThemeToggle/></div><section className="year-panel"><h1>Your daily space.</h1><p className="subtle">Five habits. Private progress. Available on every device.</p>{message&&<p role="status" className="notice">{message}</p>}<a className="primary" style={{marginTop:24,width:'100%'}} href="/auth/google">Continue with Google</a><p className="subtle" style={{marginTop:20}}>Sign in or create an account. You can permanently delete your account and history in Account settings.</p><p className="subtle">We use your Google account only to identify you. We don’t request access to your email, files, or contacts.</p><p><a className="subtle" href="/privacy">How your data is handled</a></p></section></main>;
}
