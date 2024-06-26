import { useQuery } from "@tanstack/react-query";
import { useSelectedContact } from "../../user/useSelectedUser";
import MessageAPI from "../../../api/message";
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { MessageResponse } from "../../../api/message.types";
import { useEffect } from "react";
import { ChatModeType, ChatModes } from "../../chat/useChatMode";

const GET_MESSAGES = "GET_MESSAGES";
export const useMessagesQuery = (mode: ChatModeType) => {
	const { selectedContact, selectedGroup } = useSelectedContact();
	const { setUserMessages, messages } = useMessages();
	const id =
		mode === ChatModes.GROUP ? selectedGroup?.id : selectedContact?.id;
	const query = useQuery({
		queryKey: [GET_MESSAGES, mode, id],
		queryFn: () =>
			selectedContact
				? MessageAPI.getMessages(selectedContact?.id)
				: selectedGroup
				? MessageAPI.getGroupMessages(selectedGroup.id)
				: [],
	});

	useEffect(() => {
		if (query.data && selectedContact && !messages[selectedContact.id]) {
			setUserMessages(selectedContact?.id, query.data);
		} else if (query.data && selectedGroup && !messages[selectedGroup.id]) {
			setUserMessages(selectedGroup.id, query.data);
		}
	}, [messages, query.data, selectedContact, selectedGroup, setUserMessages]);

	return query;
};

interface State {
	messages: { [key: string]: (MessageResponse & { isTemp?: boolean })[] };
}
interface Action {
	setUserMessages: (userId: string, messages: MessageResponse[]) => void;
	addUserMessage: (
		userId: string,
		message: MessageResponse & { isTemp?: boolean }
	) => void;
	removeUserMessage: (userId: string, messageId: string) => void;
	replaceTempWithReal: (
		userId: string,
		tempId: string,
		message: MessageResponse
	) => void;
}
export const useMessages = create(
	devtools(
		immer<State & Action>((set) => ({
			messages: {},
			setUserMessages: (userId, messages) =>
				set((state) => {
					state.messages[userId] = messages;
				}),
			addUserMessage: (userId, message) =>
				set((state) => {
					if (state.messages[userId] === undefined) {
						state.messages[userId] = [message];
					} else {
						state.messages[userId] = [
							message,
							...state.messages[userId],
						];
					}
				}),
			removeUserMessage: (userId, messageId) =>
				set((state) => {
					state.messages[userId] = state.messages[userId].filter(
						(message) => message.id !== messageId
					);
				}),
			replaceTempWithReal: (userId, tempId, message) =>
				set((state) => {
					state.messages[userId] = state.messages[userId].map(
						(current) => {
							if (current.id === tempId) {
								return message;
							}
							return current;
						}
					);
				}),
		}))
	)
);
