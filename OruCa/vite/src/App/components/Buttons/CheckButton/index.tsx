import { IconButton, IconButtonProps } from '@chakra-ui/react';
import { FaCheck } from "react-icons/fa";

const CheckButton: React.FC<IconButtonProps> = ({...props}) => {
	return (
		<IconButton	
			aria-label="Submit student_Name Change"
			backgroundColor={"green.600"}
			shadow={"md"}
			size={["2xs", null, "md"]}
			_hover={{
				transform:"scale(1.1)"
			}}
			{...props}
		>
			<FaCheck/>
		</IconButton>)
}

export default CheckButton;