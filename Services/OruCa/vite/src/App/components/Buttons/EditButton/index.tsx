import { IconButton, IconButtonProps } from "@chakra-ui/react";
import React from "react";
import { FaEdit } from "react-icons/fa";

const EditButton:React.FC<IconButtonProps> = ({...props})=>{
	return (
		<IconButton
			aria-label={"Enter edit"}
			backgroundColor={"none/20"}
			size={["2xs", null, "md"]}
			variant={"plain"}
			borderColor={"blackAlpha.300"}
			_hover={{
				transform: "scale(1.1)"
			}}
			{...props}
		>
			<FaEdit/>
		</IconButton>	
	);
}

export default EditButton;