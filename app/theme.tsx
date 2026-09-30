'use client';
import {ThemeProvider,useTheme} from 'next-themes';
import {Moon,Sun} from 'lucide-react';
import {useEffect,useState} from 'react';
export function Theme({children}:{children:React.ReactNode}){return <ThemeProvider attribute="class" defaultTheme="system" enableSystem>{children}</ThemeProvider>;}
export function ThemeToggle(){const {resolvedTheme,setTheme}=useTheme(),[mounted,setMounted]=useState(false);useEffect(()=>setMounted(true),[]);const dark=mounted&&resolvedTheme==='dark';return <button className="icon-button" aria-label={dark?'Switch to light mode':'Switch to dark mode'} onClick={()=>setTheme(dark?'light':'dark')}>{dark?<Sun size={19}/>:<Moon size={19}/>}</button>;}
