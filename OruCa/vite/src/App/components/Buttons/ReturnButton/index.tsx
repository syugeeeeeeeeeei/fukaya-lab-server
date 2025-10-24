import { IconButton } from "@chakra-ui/react";
import React from "react";
import { BsArrowReturnLeft } from "react-icons/bs";
import { useNavigate } from "react-router-dom";

type TReturnButton = {
	address:string
}

const ReturnButton:React.FC<TReturnButton> = ({address})=>{
	const navigate = useNavigate();
	const handleClick = () => {
		navigate(address);
	};
	return (
		<IconButton
			aria-label="Return Before Page"
			backgroundColor={"red.500"}
			shadow={"md"}
			transition="transform 0.8s ease-in-out"
			_hover={{
				transform: 'rotate(360deg)',
			}}
			size={["md", null, "xl"]}
			onClick={handleClick}
		>
			<BsArrowReturnLeft/>
		</IconButton>
	)
}

export default ReturnButton;