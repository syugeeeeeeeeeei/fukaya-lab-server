// SlackService.ts
import { SLACK_BOT_TOKEN, SLACK_CHANNEL_ID } from "@src/config";

export class SlackService {
	// Slackにメッセージを投稿するメソッド
	public async postMessage(message: string): Promise<void> {
		try {
			const response = await fetch('https://slack.com/api/chat.postMessage', {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					channel: SLACK_CHANNEL_ID,
					text: message
				})
			});

			if (!response.ok) {
				throw new Error(`Slack API error: ${response.status}`);
			}

			console.log("SlackBotにメッセージを送信しました");
		} catch (error) {
			console.error("SlackBot送信エラー:", error);
			throw error;
		}
	}
}