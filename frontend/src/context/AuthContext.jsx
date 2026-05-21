import { createContext,useState,useEffect } from "react";

export const AuthContext = createContext(null);

export const AuthProvider = ({children}) => {
    const [user,setUser] = useState(null);
    const [loading,setLoading] = useState(true);

    useEffect(()=>{
        const savedUser = localStorage.getItem('chat_user');
        const savedToken = localStorage.getItem('chat_token');
        if(savedUser && savedToken){
            setUser(JSON.parse(savedUser));
        }
        setLoading(false);
    },[]);

    const login = (userData) => {
        const userPayload =  {id : userData._id , username : userData.username};
        setUser(userPayload);

        localStorage.setItem('chat_token', userData.token);
        localStorage.setItem('chat_user',JSON.stringify(userPayload));
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('chat_token');
        localStorage.removeItem('chat_user');
    };

    return (
        <AuthContext.Provider value={{user,login,logout,loading}}>
            {!loading && children}
        </AuthContext.Provider>
    );
};