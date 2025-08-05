import { useState } from "react";
import { Edit3, Camera, Check, X } from "lucide-react";
import { 
  uploadPhoto, 
  updateEmail, 
  updateNameSurname, 
  updateNickname,
  changePassword,
  FieldUpdateResponse
} from "../services/profileService";
import { useUser } from "../context/UserContext";
import { UserDTO } from "../types/userDTO";

interface ProfilePopupProps {
  onClose: () => void;
  user: UserDTO;
}

interface ErrorState {
  [key: string]: string | null | undefined;
  general?: string | null;
  photo?: string | null;
  password?: string | null;
}

type EditableField = 'name' | 'surname' | 'nickname' | 'email' | 'password';

export default function ProfilePopup({ onClose, user }: ProfilePopupProps) {
  const { setUser } = useUser();
  const [editField, setEditField] = useState<EditableField | null>(null);
  const [error, setError] = useState<ErrorState>({});
  const [loading, setLoading] = useState(false);
  const [updatedFields, setUpdatedFields] = useState<Set<string>>(new Set());

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const triggerHighlight = (field: string) => {
    setUpdatedFields(prev => {
      const newSet = new Set(prev);
      newSet.add(field);
      return newSet;
    });
    setTimeout(() => {
      setUpdatedFields(prev => {
        const newSet = new Set(prev);
        newSet.delete(field);
        return newSet;
      });
    }, 5000);
  };

  const handleChange = (field: EditableField, value: string) => {
    if (field === "password") {
      // Burada state değişimi yok, çünkü password UserDTO'da yok
      return;
    }
    setUser(prev => prev ? { ...prev, [field]: value } : prev);
  };

  const handleSubmit = async (field: EditableField) => {
    setLoading(true);
    setError(prev => ({ ...prev, [field]: null }));
    
    try {
      let response: FieldUpdateResponse | FieldUpdateResponse[];
      
      if (field === "email") {
        response = await updateEmail(user.email);
        setUser(prev => prev ? { ...prev, email: (response as FieldUpdateResponse).value } : prev);
      } else if (field === "name" || field === "surname") {
        response = await updateNameSurname(user.name, user.surname);
        (response as FieldUpdateResponse[]).forEach(fieldUpdate => {
          setUser(prev => prev ? { ...prev, [fieldUpdate.field]: fieldUpdate.value } : prev);
        });
      } else if (field === "nickname") {
        response = await updateNickname(user.nickname);
        setUser(prev => prev ? { ...prev, nickname: (response as FieldUpdateResponse).value } : prev);
      }
      
      triggerHighlight(field);
      setEditField(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Update failed";
      setError(prev => ({ ...prev, [field]: errorMessage }));
    }
    setLoading(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    
    try {
      setLoading(true);
      const response = await uploadPhoto(e.target.files[0]);
      setUser(prev => prev ? { ...prev, profileImageUrl: response.value } : prev);
      triggerHighlight("photo");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Upload failed";
      setError(prev => ({ ...prev, photo: errorMessage }));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async () => {
    if (newPassword !== confirmPassword) {
      setError(prev => ({ ...prev, password: "Passwords do not match" }));
      return;
    }
    setLoading(true);
    setError(prev => ({ ...prev, password: null }));
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      triggerHighlight("password");
      setEditField(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Password update failed";
      setError(prev => ({ ...prev, password: errorMessage }));
    }
    setLoading(false);
  };

  const renderField = (label: string, field: EditableField, value: string, type: string = "text") => {
    const isEditing = editField === field;
    const highlight = updatedFields.has(field);
    return (
      <div className="group">
        <label className="block text-sm font-medium text-gray-400 mb-2 uppercase tracking-wider">
          {label}
        </label>
        {isEditing ? (
          <div className="flex items-center gap-3">
            <input
              type={type}
              value={value || ""}
              onChange={(e) => handleChange(field, e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit(field)}
              className={`bg-gray-800/50 text-white rounded-xl px-4 py-3 flex-1 border transition-all duration-500 ${
                highlight 
                  ? "bg-green-500/20 border-green-500/50 shadow-lg shadow-green-500/20" 
                  : "border-gray-700"
              } focus:border-orange-500 focus:outline-none`}
              disabled={loading}
              autoFocus
            />
            <button
              onClick={() => handleSubmit(field)}
              className="bg-gradient-to-r from-orange-500 to-pink-500 p-3 rounded-xl text-white"
              disabled={loading}
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Check size={16} />
              )}
            </button>
            <button
              onClick={() => {
                setEditField(null);
                setError(prev => ({ ...prev, [field]: null }));
              }}
              className="bg-gray-700 p-3 rounded-xl text-white"
              disabled={loading}
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div
            className={`flex items-center justify-between bg-gray-800/30 rounded-xl px-4 py-3 border transition-all duration-500 ${
              highlight 
                ? "bg-green-500/20 border-green-500/50 shadow-lg shadow-green-500/20" 
                : "border-gray-800"
            }`}
          >
            <span className="text-white">{value || "Not set"}</span>
            <button
              onClick={() => setEditField(field)}
              className="text-gray-400 hover:text-orange-400 p-2"
            >
              <Edit3 size={16} />
            </button>
          </div>
        )}
        {error[field] && (
          <p className="text-red-400 text-sm mt-2">{error[field]}</p>
        )}
      </div>
    );
  };

  const renderPasswordForm = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <input
          type="password"
          placeholder="Current password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="bg-gray-800/50 text-white rounded-xl px-4 py-3 w-full border border-gray-700 focus:border-orange-500 focus:outline-none"
        />
        <input
          type="password"
          placeholder="New password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="bg-gray-800/50 text-white rounded-xl px-4 py-3 w-full border border-gray-700 focus:border-orange-500 focus:outline-none"
        />
        <input
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="bg-gray-800/50 text-white rounded-xl px-4 py-3 w-full border border-gray-700 focus:border-orange-500 focus:outline-none"
        />
      </div>
      
      {error.password && (
        <p className="text-red-400 text-sm">{error.password}</p>
      )}
      
      <div className="flex gap-3">
        <button
          onClick={handlePasswordSubmit}
          className="flex-1 bg-gradient-to-r from-orange-500 to-pink-500 p-3 rounded-xl text-white flex items-center justify-center"
          disabled={loading}
        >
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <Check size={16} />
          )}
        </button>
        <button
          onClick={() => setEditField(null)}
          className="bg-gray-700 p-3 rounded-xl text-white"
          disabled={loading}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl shadow-2xl w-full max-w-6xl h-[710] flex overflow-hidden border border-gray-700">
        
        {/* Left Section - Fixed height with scrollable content */}
        <div className="w-3/5 flex flex-col">
          {/* Header - Fixed */}
          <div className="px-12 pt-4 pb-6 border-b border-gray-700/30">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold bg-white bg-clip-text text-transparent leading-relaxed">
                {editField === "password" ? "Change Password" : "Profile Settings"}
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white p-2 rounded-xl"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Content - Scrollable with fixed height */}
          <div className="flex-1 p-12 pt-6 overflow-y-auto">
            {error.general && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-red-400">{error.general}</p>
              </div>
            )}

            {editField === "password" ? (
              renderPasswordForm()
            ) : (
              <div className="space-y-8">
                {renderField("First Name", "name", user.name)}
                {renderField("Last Name", "surname", user.surname)}
                {renderField("Username", "nickname", user.nickname)}
                {renderField("Email Address", "email", user.email, "email")}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2 uppercase tracking-wider">
                    Password
                  </label>
                  <div className={`flex items-center justify-between bg-gray-800/30 rounded-xl px-4 py-3 border transition-all duration-500 ${
                    updatedFields.has("password") 
                      ? "bg-green-500/20 border-green-500/50 shadow-lg shadow-green-500/20" 
                      : "border-gray-800"
                  }`}>
                    <span className="text-gray-400">••••••••</span>
                    <button
                      onClick={() => setEditField("password")}
                      className="text-gray-400 hover:text-orange-400 p-2"
                    >
                      <Edit3 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Section - Fixed */}
        <div className="w-2/5 bg-gradient-to-br from-gray-800 to-gray-900 flex flex-col p-6">
          <div className="flex-1 flex items-center justify-center mb-6">
            <div className="relative w-full aspect-square max-h-full">
              <img
                src={user.profileImageUrl || "https://via.placeholder.com/300"}
                alt="Profile"
                className={`w-full h-full object-cover rounded-2xl shadow-2xl transition-all duration-500 ${
                  updatedFields.has("photo") 
                    ? "ring-4 ring-green-500/50 shadow-green-500/20" 
                    : ""
                }`}
              />
              <label className="absolute bottom-4 right-4 cursor-pointer">
                <div className="bg-gradient-to-r from-orange-500 to-pink-500 p-3 rounded-full text-white shadow-lg hover:shadow-xl transition-shadow">
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <Camera size={18} />
                  )}
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handlePhotoUpload}
                  disabled={loading}
                />
              </label>
            </div>
          </div>

          {error.photo && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-red-400 text-sm">{error.photo}</p>
            </div>
          )}

          <div className="text-center">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-4">
              {user.name} {user.surname}
            </h1>
            <p className="text-lg md:text-l mb-4 text-orange-400 truncate">@{user.nickname}</p>
          </div>
        </div>
      </div>
    </div>
  );
}