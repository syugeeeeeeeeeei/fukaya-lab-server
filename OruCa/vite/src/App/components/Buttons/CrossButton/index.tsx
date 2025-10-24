import { IconButton, IconButtonProps } from "@chakra-ui/react";
import React from "react";
import { RxCross2 } from "react-icons/rx";

const CrossButton: React.FC<IconButtonProps> = ({...props}) => {
	return (
		<IconButton
			aria-label={"Cancel edit"}
			backgroundColor={"red.400"}
			shadow={"md"}
			size={["2xs", null, "md"]}
			_hover={{
				transform: "scale(1.1)"
			}}
			{...props}

		>
			<RxCross2/>
		</IconButton>
	);
}
export default CrossButton;