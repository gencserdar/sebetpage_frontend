import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import FriendsList from "./FriendsList";
import { UserDTO } from "../../types/userDTO";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  setSelectedFriend: (friend: UserDTO) => void;
}

export default function FriendsPanel({
  isOpen,
  onClose,
  setSelectedFriend,
}: Props) {
  const [activeTab, setActiveTab] = useState<"friends" | "suggestions">(
    "friends"
  );

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={() => {}}>
        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            {/* Overlay */}
            <Transition.Child
              as={Fragment}
              enter="ease-in-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in-out duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="absolute inset-0 bg-black/40 transition-opacity" />
            </Transition.Child>

            {/* Drawer (Top) */}
            <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-300"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-200"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="w-[350px] h-full bg-gray-950/98 backdrop-blur-xl text-white shadow-2xl border-l border-gray-800/40 flex flex-col">
                  {" "}
                  {/* Header */}
                  <div className="flex items-center justify-between p-4 border-b border-gray-800/40 bg-gray-900/80">
                    <h2 className="text-lg font-semibold text-gray-100">
                      Messages
                    </h2>
                    <button
                      onClick={onClose}
                      className="text-gray-500 hover:text-white transition-colors duration-200 hover:bg-gray-800/60 rounded-lg p-1"
                    >
                      ✕
                    </button>
                  </div>
                  {/* Tabs */}
                  <div className="flex justify-around border-b border-gray-800/40 bg-gray-900/50">
                    {["friends", "suggestions"].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`py-3 px-4 transition-all duration-200 text-sm font-medium ${
                          activeTab === tab
                            ? "border-b-2 border-indigo-400 text-white bg-gray-900/60"
                            : "text-gray-500 hover:text-gray-300 hover:bg-gray-900/30"
                        }`}
                      >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                      </button>
                    ))}
                  </div>
                  {/* Content */}
                  <div className="p-3 overflow-y-auto flex-1 bg-gradient-to-b from-gray-950/60 to-black/80 custom-scrollbar">
                    <style
                      dangerouslySetInnerHTML={{
                        __html: `
                        .custom-scrollbar::-webkit-scrollbar {
                          height: 6px;
                        }
                        .custom-scrollbar::-webkit-scrollbar-track {
                          background: rgba(0, 0, 0, 0.4);
                          border-radius: 10px;
                        }
                        .custom-scrollbar::-webkit-scrollbar-thumb {
                          background: rgba(99, 102, 241, 0.5);
                          border-radius: 10px;
                          transition: background-color 0.2s ease;
                        }
                        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                          background: rgba(99, 102, 241, 0.7);
                        }
                      `,
                      }}
                    />
                    {activeTab === "friends" && (
                      <FriendsList onSelectFriend={setSelectedFriend} />
                    )}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
