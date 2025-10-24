import { IconButton, IconButtonProps, Text } from "@chakra-ui/react";
import React from "react";

// DeleteTooltipコンポーネント
const DeleteButton: React.FC<IconButtonProps> = ({ ...props }) => {
	return (
			<IconButton
				aria-label="Delete student"
				backgroundColor={"red.500"}
				color={"white"}
				shadow={"md"}
				size={["2xs", null, "md"]}
				_hover={{
					transform: "scale(1.1)"
				}}
				px={[1, null, 2]}
				w={"fit-content"}
				{...props}
			>
			<Text fontSize={["2xs", null, "md"]}>DELETE</Text>
			</IconButton>
	);
}

export default DeleteButton;
