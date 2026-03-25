"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Vortex } from "@/components/ui/vortex";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";

type SignInFormData = {
  email: string;
  password: string;
};

type NotificationType = "success" | "error" | "info";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
}

const NotificationCard = ({ 
  notification, 
  onClose 
}: { 
  notification: Notification; 
  onClose: (id: string) => void;
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(notification.id);
    }, 5000);

    return () => clearTimeout(timer);
  }, [notification.id, onClose]);

  const getNotificationStyles = (type: NotificationType) => {
    switch (type) {
      case "success":
        return "bg-green-50 border-green-200 text-green-800";
      case "error":
        return "bg-green-50 border-green-200 text-green-800";
      case "info":
        return "bg-green-50 border-green-200 text-green-800";
      default:
        return "bg-gray-50 border-gray-200 text-gray-800";
    }
  };

  const getIconColor = (type: NotificationType) => {
    switch (type) {
      case "success":
        return "text-green-500";
      case "error":
        return "text-green-500";
      case "info":
        return "text-green-500";
      default:
        return "text-gray-400";
    }
  };

  return (
    <div className={`p-4 rounded-lg border shadow-lg ${getNotificationStyles(notification.type)} animate-in slide-in-from-top-2 duration-300`}>
      <div className="flex items-start">
        <div className="shrink-0">
          {notification.type === "success" && (
            <svg className={`w-5 h-5 ${getIconColor(notification.type)}`} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          )}
          {notification.type === "error" && (
            <svg className={`w-5 h-5 ${getIconColor(notification.type)}`} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          )}
          {notification.type === "info" && (
            <svg className={`w-5 h-5 ${getIconColor(notification.type)}`} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          )}
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium">{notification.title}</h3>
          <p className="text-sm mt-1 opacity-90">{notification.message}</p>
        </div>
        <button
          onClick={() => onClose(notification.id)}
          className="ml-4 inline-flex text-gray-400 hover:text-gray-600 focus:outline-none"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default function SignIn() {
  const router = useRouter();
  const { 
    register, 
    handleSubmit, 
    formState: { errors }, 
    setError,
    clearErrors 
  } = useForm<SignInFormData>({
    mode: "onChange"
  });
  
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (type: NotificationType, title: string, message: string) => {
    const id = Date.now().toString();
    const notification: Notification = { id, type, title, message };
    setNotifications(prev => [...prev, notification]);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const validateForm = (data: SignInFormData): boolean => {
    let isValid = true;
    clearErrors();

    if (!data.email) {
      setError("email", { type: "required", message: "Email is required" });
      isValid = false;
    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(data.email)) {
      setError("email", { type: "pattern", message: "Please enter a valid email address" });
      isValid = false;
    }

    if (!data.password) {
      setError("password", { type: "required", message: "Password is required" });
      isValid = false;
    } else if (data.password.length < 6) {
      setError("password", { type: "minLength", message: "Password must be at least 6 characters" });
      isValid = false;
    }

    return isValid;
  };

  const onSubmit = async (data: SignInFormData) => {
    if (!validateForm(data)) {
      addNotification("error", "Validation Error", "Please fix the errors below and try again.");
      return;
    }

    setLoading(true);
    
    try {
      const res = await signIn("credentials", {
        redirect: false,
        email: data.email,
        password: data.password,
      });

      if (res?.error) {
        let errorMessage = "Sign-in failed. Please try again.";
        
        if (res.error === "CredentialsSignin") {
          errorMessage = "Invalid email or password. Please check your credentials.";
        } else if (res.error === "AccessDenied") {
          errorMessage = "Access denied. Your account may be inactive.";
        } else if (res.error === "Verification") {
          errorMessage = "Please verify your email address before signing in.";
        }

        addNotification("error", "Sign-in Failed", errorMessage);
      } else {
        addNotification("success", "Success!", "Signing you in...");
        
        router.push("/dashboard");
      }
    } catch (error) {
      addNotification("error", "Connection Error", "Unable to connect to the server. Please check your internet connection and try again.");
      console.error("Sign-in error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center relative">
 <Vortex backgroundColor="transparent" className="h-svh flex items-center justify-center px-4 relative">
      <div className="fixed top-4 right-4 z-50 space-y-2 w-full max-w-md">
        {notifications.map(notification => (
          <NotificationCard
            key={notification.id}
            notification={notification}
            onClose={removeNotification}
          />
        ))}
      </div>

      {loading && (
        <div className="fixed inset-0 bg-black/50 z-100 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 flex flex-col items-center space-y-4">
            <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-700 font-medium">Signing you in...</p>
          </div>
        </div>
      )}

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 ">
        <h2 className="text-3xl font-bold text-center text-[#1F2937] mb-8">
          Sign In
        </h2>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <Input
              {...register("email")}
              type="text"
              placeholder="Email"
              className={`h-12 px-4 border focus:ring-2 focus:ring-green-500 focus:outline-none rounded-md ${
                errors.email ? "border-red-600" : "border-green-200"
              }`}
            />
          </div>

          <div>
            <Input
              {...register("password")}
              type="password"
              placeholder="Password"
              className={`h-12 px-4 border focus:ring-2 focus:ring-green-500 focus:outline-1 rounded-md ${
                errors.password ? "border-red-600" : "border-green-200"
              }`}
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-[#4ADE80] hover:bg-[#22C55E] disabled:bg-green-300 text-black text-lg font-semibold rounded-md transition duration-200"
          >
            {loading ? "Signing In..." : "Sign In"}
          </Button>
        </form>
        
        <p className="mt-6 text-center text-sm text-gray-800">
          {"Don't have an account? "}
          <Link href="/signup" className="text-green-600 hover:underline">
            Sign up here
          </Link>
        </p>
      </div>
      </Vortex>
    </div>
  );
}