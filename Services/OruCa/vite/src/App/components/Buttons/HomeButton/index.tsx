import { IconButton } from "@chakra-ui/react";
import React from "react";
import { AiOutlineHome } from "react-icons/ai";
import { useNavigate } from "react-router-dom";

type THomeButton = {
	address:string
}

const HomeButton:React.FC<THomeButton> = ({address})=>{
	const navigate = useNavigate();
	const handleClick = () => {
		navigate(address);
	};
	return (
		<IconButton
			aria-label="Return MainPage"
			backgroundColor={"default"}
			shadow={"md"}
			transition="transform 0.8s ease-in-out"
			_hover={{
				transform: 'rotate(360deg)',
			}}
			size={["md", null, "xl"]}
			onClick={handleClick}
		>
			<AiOutlineHome/>
		</IconButton>
	)
}

export default HomeButton;