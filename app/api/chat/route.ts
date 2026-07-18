// import { loadChatMessages, saveChatMessages } from "@/features/ai/actions/chat-store";
// import { webSearchTool } from "@/features/ai/tools/web-search-tool";
// import { getChatModel } from "@/features/ai/utils/model";
// import { requireUser } from "@/features/auth/action/require-user";
// import { prisma } from "@/lib/db";
// import { auth } from "@clerk/nextjs/server";
// import {
//     convertToModelMessages,
//     createIdGenerator,
//     createUIMessageStreamResponse,
//     stepCountIs,
//     streamText,
//     toUIMessageStream,
//     type UIMessage,
// } from "ai";

// /**
//  * POST /api/chat — Streams an AI assistant reply for a message on a branch.
//  *
//  * Validates auth, conversation, and branch ownership, persists the user
//  * message onto the branch's message tree, then streams the assistant
//  * response (with web-search tool calling) via the AI SDK. Final messages
//  * — including any tool-call/result parts — are saved and the branch head
//  * advances when the stream ends.
//  */
// export async function POST(req: Request) {
//     await auth.protect();

//     const { message, id, branchId }: { message: UIMessage; id: string; branchId: string } =
//         await req.json();

//     if (!message || !id || !branchId) {
//         return new Response("Missing message, conversation id, or branch id", { status: 400 });
//     }

//     const user = await requireUser();

//     const conversation = await prisma.conversation.findFirst({
//         where: {
//             id,
//             userId: user.id
//         }
//     });

//     if (!conversation) {
//         return new Response("Conversation not found", { status: 404 });
//     }

//     const branch = await prisma.branch.findFirst({
//         where: { id: branchId, conversationId: id },
//     });

//     if (!branch) {
//         return new Response("Branch not found", { status: 404 });
//     }

//     const previousMessages = await loadChatMessages(branchId);

//     const alreadySaved = previousMessages.some(
//         (storedMessage) => storedMessage.id === message.id
//     )

//     const messages = alreadySaved ? previousMessages : [...previousMessages, message];

//     if (!alreadySaved) {
//         await saveChatMessages(id, branchId, [message], {
//             parentSeed: branch.headMessageId,
//         });
//     }

//     const result = streamText({
//         model: getChatModel(conversation.model),
//         system:
//             conversation.systemPrompt ??
//             "You are ChaiGpt, a helpful assistant. You have a webSearch tool — use it whenever the user asks about recent events, current facts, or anything that may have changed since your training data. After searching, weave the results into a clear, well-cited answer.",
//         messages: await convertToModelMessages(messages),
//         tools: { webSearch: webSearchTool },
//         // Allow the model to call the tool and then keep generating on the
//         // results — up to 5 steps (e.g. search -> read results -> answer).
//         stopWhen: stepCountIs(5),
//     });

//     result.consumeStream();

//     return createUIMessageStreamResponse({
//         stream: toUIMessageStream({
//             stream: result.stream,
//             originalMessages: messages,
//             generateMessageId: createIdGenerator({ prefix: "msg", size: 16 }),
//             onEnd: async ({ messages: finalMessages }) => {
//                 try {
//                     await saveChatMessages(id, branchId, finalMessages, {
//                         updateTitle: false,
//                         parentSeed: null,
//                     });
//                 } catch (error) {
//                     console.error(error);
//                 }
//             }
//         })
//     })

// }


import { loadChatMessages, saveChatMessages } from "@/features/ai/actions/chat-store";
import { webSearchTool } from "@/features/ai/tools/web-search-tool";
import { getChatModel } from "@/features/ai/utils/model";
import { requireUser } from "@/features/auth/action/require-user";
import { prisma } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import {
    convertToModelMessages,
    createIdGenerator,
    createUIMessageStreamResponse,
    stepCountIs,
    streamText,
    toUIMessageStream,
    type UIMessage,
} from "ai";

export async function POST(req: Request) {
    await auth.protect();

    const { message, id, branchId }: { message: UIMessage; id: string; branchId: string } =
        await req.json();

    if (!message || !id || !branchId) {
        return new Response("Missing message, conversation id, or branch id", { status: 400 });
    }

    const user = await requireUser();

    const conversation = await prisma.conversation.findFirst({
        where: {
            id,
            userId: user.id
        }
    });

    if (!conversation) {
        return new Response("Conversation not found", { status: 404 });
    }

    const branch = await prisma.branch.findFirst({
        where: { id: branchId, conversationId: id },
    });

    if (!branch) {
        return new Response("Branch not found", { status: 404 });
    }

    const previousMessages = await loadChatMessages(branchId);

    const alreadySaved = previousMessages.some(
        (storedMessage) => storedMessage.id === message.id
    )

    const messages = alreadySaved ? previousMessages : [...previousMessages, message];

    if (!alreadySaved) {
        await saveChatMessages(id, branchId, [message], {
            parentSeed: branch.headMessageId,
        });
    }

    const result = streamText({
        model: getChatModel(conversation.model),
        system:
            conversation.systemPrompt ??
            "You are ChaiGpt, a helpful assistant. You have a webSearch tool — use it whenever the user asks about recent events, current facts, or anything that may have changed since your training data. After searching, weave the results into a clear, well-cited answer.",
        messages: await convertToModelMessages(messages),
        tools: { webSearch: webSearchTool },
        // Allow the model to call the tool and then keep generating on the
        // results — up to 5 steps (e.g. search -> read results -> answer).
        stopWhen: stepCountIs(5),
    });

    result.consumeStream();

    return createUIMessageStreamResponse({
        stream: toUIMessageStream({
            stream: result.stream,
            originalMessages: messages,
            generateMessageId: createIdGenerator({ prefix: "msg", size: 16 }),
            onEnd: async ({ messages: finalMessages }) => {
                try {
                    await saveChatMessages(id, branchId, finalMessages, {
                        updateTitle: false,
                        parentSeed: null,
                    });
                } catch (error) {
                    console.error(error);
                }
            }
        })
    })

}