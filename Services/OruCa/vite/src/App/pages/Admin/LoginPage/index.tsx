import HomeButton from "@components/Buttons/HomeButton";
import HeadBar from "@components/HeadBar";
import LoginForm from "./LoginForm";

function LoginPage(){
	
	return (
		<HeadBar otherElements={[
			<HomeButton address={"/"}/>
		]}>
			<LoginForm/>
		</HeadBar>
	);
}
export default LoginPage;