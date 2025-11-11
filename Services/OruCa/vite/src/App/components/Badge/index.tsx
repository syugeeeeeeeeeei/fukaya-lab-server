import { Status, Text } from "@chakra-ui/react";
import React from 'react';


interface BadgeProps {
	isTrue: boolean;
	text: {
		true: string;
		false: string;
	};
}

const Badge:React.FC<BadgeProps> = ({isTrue,text}) => {
	const color = isTrue ? "green":"red";
	const message = isTrue ? text.true:text.false;

	return (
		<Status.Root
			colorPalette={color} 
			size={["sm", null, "lg"]}
			color={`${color}.700`}
			fontWeight={"bold"}
			backgroundColor={`${color}.100`}
			fontSize={["xs", null, "lg"]}
			border={`1px solid ${color}`}
			px={[1, null, 2]}
			py={[1, null, 2]}
			borderRadius={8}
			gap={5}
			>
			<Status.Indicator />
			<Text>{message}</Text>
		</Status.Root>
	)
}

export default Badge;
