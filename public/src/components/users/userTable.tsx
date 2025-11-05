"use client";
import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";

import UserTableShimmer from "../shimmer/UserTableShimmer";
import { changeUserPassword, createUser, getUsersList, updateUser } from "@/utils/apiHandler/request";
import { getCookie } from "@/utils/helpers/cookie";
import ThreeDotDropdown from "../common/ThreedotDropdown";
import Image from "next/image";
// import Pagination from "../tables/Pagination";
import { useModal } from "@/hooks/useModal";
import { Modal } from "../ui/modal";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import Swal from "sweetalert2";


interface UserRole {
  id: number;
  name: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  avatar: string | null;
  provider: string | null;
  provider_id: string | null;
  remember_token: string | null;
  created_at: string;
  updated_at: string;
  roles: UserRole[];
}

interface UserCreatePayload {
  name: string;
  email: string;
}

interface ChangePasswordPayload {
  password: string;
  password_confirmation: string;
}



export default function UserTable() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [formSubmitLoader, setFormSubmitLoader] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: currentUser?.name || "",
    email: currentUser?.email || "",
  });
  const [passwordFormData, setPasswordFormData] = useState({
    password: "",
    password_confirmation: "",
  });
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const fetchUsers = async () => {
    const token = getCookie("auth_token") || "";
    try {
      const response = await getUsersList(token);
      const data: User[] = await response;
      setUsers(data);
      setFilteredUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (currentUser) {
      setFormData({
        name: currentUser.name || "",
        email: currentUser.email || "",
      });
    } else {
      setFormData({
        name: "",
        email: "",
      });
    }
  }, [currentUser]);

  useEffect(() => {
    const lowerQuery = searchQuery.toLowerCase();
    setFilteredUsers(
      users.filter(
        (user) =>
          user.name?.toLowerCase().includes(lowerQuery) ||
          user.email?.toLowerCase().includes(lowerQuery)
      )
    );
  }, [searchQuery, users]);


  const { isOpen: isFirstOpen, openModal: openFirstModal, closeModal: closeFirstModal } = useModal();
  const { isOpen: isSecondOpen, openModal: openSecondModal, closeModal: closeSecondModal } = useModal();
  // const handleAddUser = () => {
  //   setModalMode("add");
  //   setCurrentUser(null);
  //   openFirstModal();
  // };

  const handleEdit = (user: User) => {
    setModalMode("edit");
    setCurrentUser(user);
    openFirstModal();
    console.log('Edit clicked');
  };

  const handleChangePassword = (user: User) => {
    setCurrentUser(user);
    openSecondModal();
  }

  // const handleDelete = async (user: User) => {
  //   const confirmResult = await Swal.fire({
  //     title: `Delete user "${user.name}"`,
  //     text: "This action cannot be undone!",
  //     icon: "warning",
  //     showCancelButton: true,
  //     confirmButtonColor: "#d33",
  //     cancelButtonColor: "#3085d6",
  //     confirmButtonText: "Yes, delete it!",
  //     cancelButtonText: "Cancel",
  //   });
  //   if (!confirmResult.isConfirmed) return;

  //   const token = getCookie("auth_token") || "";
  //   try {
  //     const response = await deleteUser(token, user.id);
  //     if (response) {
  //       Swal.fire({
  //         title: 'Success',
  //         text: 'User deleted successfully',
  //         icon: 'success',
  //         confirmButtonText: 'OK'
  //       });
  //       setUsers(prev => prev.filter(u => u.id !== user.id));
  //       setFilteredUsers(prev => prev.filter(u => u.id !== user.id));
  //     } else {
  //       console.error("Failed to delete role:", response);
  //     }

  //   } catch (error) {
  //     console.error("Error deleting user:", error);
  //   }
  // };
  // const [currentPage, setCurrentPage] = useState(1);
  // const totalPages = 10;

  const handleSaveUser = async () => {
    setFormSubmitLoader(true);
    const token = getCookie("auth_token") || "";

    // Create base payload
    const payload: UserCreatePayload = {
      name: formData.name,
      email: formData.email
    };
    try {
      if (modalMode === "edit" && currentUser?.id) {
        // UPDATE USER
        const response = await updateUser(token, currentUser.id, payload);

        if (response) {
          setUsers(prev =>
            prev.map(u => (u.id === currentUser.id ? response.data.user : u))
          );
          setFilteredUsers(prev =>
            prev.map(u => (u.id === currentUser.id ? response.data.user : u))
          );
          await Swal.fire({
            title: 'Updated!',
            text: 'User updated successfully.',
            icon: 'success',
            timer: 1800,
            showConfirmButton: false
          });
        }
      } else {
        // Create User
        const response = await createUser(token, payload);
        if (response) {
          setUsers(prev => [...prev, response.data.user]);
          setFilteredUsers(prev => [...prev, response.data.user]);
          await Swal.fire({
            title: 'Created!',
            text: 'User created successfully.',
            icon: 'success',
            timer: 1800,
            showConfirmButton: false
          });
        }
        console.log("User created:", response);
      }
      // Close modal and reset form after alert
      closeFirstModal();
      setFormData({
        name: "",
        email: ""
      });
      setFormSubmitLoader(false);


    } catch (error) {
      setFormSubmitLoader(false);
      console.error(
        `Error ${modalMode === "edit" ? "updating" : "creating"} user:`,
        error
      );
    }
  };

  const handleSavePassword = async () => {
    setFormSubmitLoader(true);
    const token = getCookie("auth_token") || "";

    // Create base payload
    const payload: ChangePasswordPayload = {
      password: passwordFormData.password,
      password_confirmation: passwordFormData.password_confirmation
    };

    try {
      const response = await changeUserPassword(token, currentUser?.id, payload);
      if(response){
  // Reset form fields
  setPasswordFormData({ password: "", password_confirmation: "" });
  closeSecondModal();
  setFormSubmitLoader(false);
        Swal.fire({
          title: 'Password Updated!',
          text: 'Password changed successfully.',
          icon: 'success',
          timer: 1800,
          showConfirmButton: false
        });
      }
    } catch (error) {
      setFormSubmitLoader(false);
      console.error(
        `Error updating password:`,
        error
      );
    }
  };

  if (loading) return <UserTableShimmer />;
  return (
    <>
      <div className="flex items-center justify-between mx-4 my-2">
        <div className="relative w-full max-w-xs">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            {/* Search Icon SVG */}
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <Input
            type="text"
            placeholder="Search users..."
            className="pl-10"
            defaultValue={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {/* <button
          className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          onClick={handleAddUser}
        >
          + <span className="hidden sm:inline-block">Add User</span>
        </button> */}
      </div>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <div className="min-w-[1000px]">
            <Table>
              {/* Table Header */}
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    User
                  </TableCell>
                  <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Email
                </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Actions
                  </TableCell>
                </TableRow>
              </TableHeader>

              {/* Table Body */}
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="px-5 py-4 sm:px-6 text-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 overflow-hidden rounded-full">
                          <Image
                            width={40}
                            height={40}
                            src={
                              user?.avatar?.startsWith('http') || user?.avatar?.startsWith('/')
                                ? user.avatar
                                : '/images/user/default.jpeg'
                            }
                            alt={user?.name || 'User'}
                          />
                        </div>
                        <div>
                          <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                            {user.name}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                      {user.email}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                      <ThreeDotDropdown
                        options={[
                          { label: 'Edit', onClick: () => handleEdit(user) },
                          { label: 'Change Password', onClick: () => handleChangePassword(user) },
                        ]}
                      />
                    </TableCell>
                  </TableRow>
                ))}

              </TableBody>
            </Table>
            {/* <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page) => setCurrentPage(page)}
            /> */}
          </div>
        </div>
      </div>
      <Modal
        isOpen={isFirstOpen}
        onClose={closeFirstModal}
        className="w-full max-w-lg sm:max-w-xl md:max-w-2xl max-h-[700px] m-4 p-0 overflow-y-auto backdrop-blur-sm"
      >
        <div className="flex flex-col h-full">
          {/* Sticky Header */}
          <div className="bg-white p-6 border-b z-10">
            <h2 className="text-lg font-semibold">
              {modalMode === "add" ? "Add User" : "Edit User"}
            </h2>
          </div>

          {/* Scrollable Content */}
          <div className="overflow-y-auto p-6 custom-scrollbar">
              <div className="grid grid-cols-1 gap-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter name"
                    className="border rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter email"
                    className="border rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
          </div>

          {/* Sticky Footer */}
          <div className="bg-white p-4 border-t z-10 flex justify-end gap-2">
            <button
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                onClick={handleSaveUser}
                disabled={formSubmitLoader}
              >
                {formSubmitLoader ? "Saving..." : "Save"}
              </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isSecondOpen}
        onClose={closeSecondModal}
        className="w-full max-w-lg sm:max-w-xl md:max-w-2xl max-h-[700px] m-4 p-0 overflow-y-auto backdrop-blur-sm"
      >
        <div className="flex flex-col h-full">
          {/* Sticky Header */}
          <div className="bg-white p-6 border-b z-10">
            <h2 className="text-lg font-semibold">
              Change Password
            </h2>
          </div>

          {/* Scrollable Content */}
          <div className="overflow-y-auto p-6 custom-scrollbar">
              <div className="grid grid-cols-1 gap-4">
                {/* Password */}
                <div>
                  <Label>Password</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      name="password"
                      value={passwordFormData.password}
                      onChange={handlePasswordChange}
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

                {/* Confirm Password */}
                <div>
                  <Label>Confirm Password</Label>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="re-enter password"
                      name="password_confirmation"
                      value={passwordFormData.password_confirmation}
                      onChange={handlePasswordChange}
                    />
                    <span
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                    >
                      {showConfirmPassword ? (
                        <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
                      ) : (
                        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
                      )}
                    </span>
                  </div>
                </div>
              </div>
          </div>

          {/* Sticky Footer */}
          <div className="bg-white p-4 border-t z-10 flex justify-end gap-2">
            <button
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                onClick={handleSavePassword}
                disabled={formSubmitLoader}
              >
                {formSubmitLoader ? "Saving..." : "Save"}
              </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
