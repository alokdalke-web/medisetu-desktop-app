import { createApi } from "@reduxjs/toolkit/query/react";

import { baseQueryWithAutoLogout } from "./baseQueryWithAutoLogout";

export type GeminiRequestPart =
	| { text: string }
	| { inlineData: { mimeType: string; data: string } };

type RunGeminiAutoAlignRequest = {
	requestParts: GeminiRequestPart[];
};

type RunGeminiAutoAlignResponse = {
	text?: string;
	message?: string;
};

export const autoAlignGeminiApi = createApi({
	reducerPath: "autoAlignGeminiApi",
	baseQuery: baseQueryWithAutoLogout,
	endpoints: (builder) => ({
		runGeminiAutoAlign: builder.mutation<
			RunGeminiAutoAlignResponse,
			RunGeminiAutoAlignRequest
		>({
			query: (body) => ({
				url: "prescription/auto-align/gemini",
				method: "POST",
				body,
			}),
		}),
	}),
});

export const { useRunGeminiAutoAlignMutation } = autoAlignGeminiApi;
