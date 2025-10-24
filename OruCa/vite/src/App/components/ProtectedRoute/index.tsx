import React from "react";
// src/components/ProtectedRoute.tsx
import { Navigate, useLocation } from "react-router-dom";

interface ProtectedRouteProps {
	children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
	const location = useLocation();
	if (!location.state?.loginStatus) {
		return <Navigate to={"/admin"} state={{loginStatus:false}}/>
	}
	return children;
};
