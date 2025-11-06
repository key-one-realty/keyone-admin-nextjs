"use client";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import React, { useState } from "react";
import { loginUser } from "@/utils/apiHandler/request";
import { currentTimeEpochTimeInMilliseconds } from "@/utils/helpers";
import { getCookie, setCookie } from "@/utils/helpers/cookie";
import { useDispatch } from "react-redux";
import { setUser } from "@/store/userSlice";

interface FormData {
  email: string;
  password: string;
}

interface FormErrors {
  email?: string;
  password?: string;
}

export default function SignInForm() {
  const dispatch = useDispatch();
  const [showPassword, setShowPassword] = useState(false);
  const [loader, setLoader] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState<FormErrors>({
    email: "",
    password: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    let valid = true;
    const newErrors = { email: "", password: "" };

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
      valid = false;
    }

    if (!formData.password.trim()) {
      newErrors.password = "Password is required";
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      setLoader(true);

      // Handle normal login
      const body = {
        email: formData.email,
        password: formData.password,
      };
      try {
        const response = await loginUser(null, body);
        const authToken = response?.access_token;
        if (authToken) {
          if (getCookie("auth_token")) {
            setCookie("auth_token", "");
          }
          setCookie("auth_token", authToken, 1);
          setCookie(
            "auth_token_validity",
            currentTimeEpochTimeInMilliseconds(),
            1
          );
          setCookie("user_name", response?.user?.name);
          setCookie("user_token", response?.user?.id);
          dispatch(setUser({
            id: response?.user?.id,
            name: response?.user?.name,
            email: response?.user?.email,
            avatar: response?.user?.profile_image || "/images/user/default.jpeg",
            roles: response?.roles,
            permissions: response?.permissions,
            isLoggedIn: true,
          }));
          window.location.href = '/'
        } else {
          const errorMessage =
            typeof response?.message === "string"
              ? response.message
              : "Invalid email or password";
          setErrors({
            email: errorMessage,
            password: errorMessage,
          });
          setLoader(false);
        }
      } catch (error) {
        console.error("Login error:", error);
        const errorMessage = "Invalid email or password";

        setErrors({
          email: errorMessage,
          password: errorMessage,
        });
        setLoader(false);
      }
    } else {
      console.log("Form validation failed");
    }
  };

  return (
    <div className="flex flex-col flex-1 lg:w-1/2 w-full">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Sign In
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Enter your email and password to sign in!
            </p>
          </div>
          <div>

            <form onSubmit={handleLogin}>
              <div className="space-y-6">
                <div>
                  <Label>
                    Email <span className="text-error-500">*</span>{" "}
                  </Label>
                  <Input name="email" placeholder="info@keyone.com" type="email" defaultValue={formData?.email} onChange={handleChange} error={errors.email ? true : false} hint={errors.email} />
                </div>
                <div>
                  <Label>
                    Password <span className="text-error-500">*</span>{" "}
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      defaultValue={formData?.password}
                      name="password"
                      onChange={handleChange} error={errors.password ? true : false} hint={errors.password}
                    />
                    <span
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                    >
                      {showPassword ? (
                        <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
                      ) : (
                        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
                      )}
                    </span>
                  </div>
                </div>
                <div>
                  <Button type="submit" className="w-full" size="sm" disabled={loader}>
                    {loader ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                        Signing in...
                      </span>
                    ) : (
                      "Sign in"
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
