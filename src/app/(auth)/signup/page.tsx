"use client";

import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Vortex } from "@/components/ui/vortex";

const formSchema = z.object({
  name: z.string().min(1, "Username is required").max(100),
  email: z.string().min(1, "Email is required").email("Invalid email"),
  password: z.string().min(8, "Password must have at least 8 characters"),
});

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
        return "bg-red-50 border-red-200 text-red-800";
      case "info":
        return "bg-blue-50 border-blue-200 text-blue-800";
      default:
        return "bg-gray-50 border-gray-200 text-gray-800";
    }
  };

  const getIconColor = (type: NotificationType) => {
    switch (type) {
      case "success":
        return "text-green-400";
      case "error":
        return "text-red-400";
      case "info":
        return "text-blue-400";
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

export default function SignUpCard() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const addNotification = (type: NotificationType, title: string, message: string) => {
    const id = Date.now().toString();
    const notification: Notification = { id, type, title, message };
    setNotifications(prev => [...prev, notification]);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const getErrorMessage = (response: Response, status: number): string => {
    switch (status) {
      case 400:
        return "Invalid data provided. Please check your inputs and try again.";
      case 409:
        return "An account with this email already exists. Please use a different email.";
      case 422:
        return "The provided information is invalid. Please check all fields.";
      case 429:
        return "Too many registration attempts. Please wait a moment and try again.";
      case 500:
        return "Server error occurred. Please try again later.";
      default:
        return "Registration failed. Please try again.";
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    
    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        addNotification(
          "success", 
          "Account Created!", 
          "Your account has been successfully created. Redirecting to sign in..."
        );
        
        // Small delay to show success message before redirect
        setTimeout(() => {
          router.push("/signin");
        }, 2000);
      } else {
        const errorMessage = getErrorMessage(response, response.status);
        addNotification("error", "Registration Failed", errorMessage);
        
        // Try to get more specific error from response
        try {
          const errorData = await response.json();
          if (errorData.message) {
            addNotification("error", "Error Details", errorData.message);
          }
        } catch (error) {
          console.log(error);
        }
      }
    } catch (error) {
      addNotification(
        "error", 
        "Connection Error", 
        "Unable to connect to the server. Please check your internet connection and try again."
      );
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  // Show validation error notification when there are form errors
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      addNotification(
        "error", 
        "Validation Error", 
        "Please fix the errors below and try again."
      );
    }
  }, [errors]);

  return (
     <div className="flex items-center justify-center relative">
    <Vortex backgroundColor="transparent" className="h-svh flex items-center justify-center px-4 relative">
      {/* Notifications Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2 w-full max-w-md">
        {notifications.map(notification => (
          <NotificationCard
            key={notification.id}
            notification={notification}
            onClose={removeNotification}
          />
        ))}
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/50 z-100 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 flex flex-col items-center space-y-4">
            <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-700 font-medium">Creating your account...</p>
          </div>
        </div>
      )}

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <h2 className="text-3xl font-bold text-center text-[#1F2937] mb-8">
          Sign Up
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <Input
              {...register("name")}
              type="text"
              placeholder="Full Name"
              className={`h-12 px-4 border focus:ring-2 focus:ring-green-500 focus:outline-none rounded-md ${
                errors.name ? "border-red-500" : "border-green-300"
              }`}
            />
            {errors.name && (
              <p className="text-sm text-red-600 mt-1 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errors.name.message}
              </p>
            )}
          </div>

          <div>
            <Input
              {...register("email")}
              type="email"
              placeholder="Email"
              className={`h-12 px-4 border focus:ring-2 focus:ring-green-500 focus:outline-none rounded-md ${
                errors.email ? "border-red-500" : "border-green-300"
              }`}
            />
            {errors.email && (
              <p className="text-sm text-red-600 mt-1 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <Input
              {...register("password")}
              type="password"
              placeholder="Password"
              className={`h-12 px-4 border focus:ring-2 focus:ring-green-500 focus:outline-none rounded-md ${
                errors.password ? "border-red-500" : "border-green-300"
              }`}
            />
            {errors.password && (
              <p className="text-sm text-red-600 mt-1 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errors.password.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-[#4ADE80] hover:bg-[#22C55E] disabled:bg-red-400 text-white text-lg font-semibold rounded-md transition duration-200"
          >
            {loading ? "Creating Account..." : "Sign Up"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link href="/signin" className="text-green-600 hover:underline">
            Login here
          </Link>
        </p>
      </div>
      </Vortex>
    </div>
  );
}