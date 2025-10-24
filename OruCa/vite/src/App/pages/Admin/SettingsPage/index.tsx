// src/pages/AdminSetting.tsx
import { Box, Heading, Text } from "@chakra-ui/react";
import HomeButton from "@components/Buttons/HomeButton";
import ReturnButton from "@components/Buttons/ReturnButton";
import HeadBar from "@components/HeadBar";
import { Toaster, toaster } from "@snippets/toaster";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import EditableDataTable from "./EditableDataTable";


function SettingsPage() {
	const location = useLocation();
	useEffect(()=>{
		if (location.state?.loginStatus) {
			Promise.resolve().then(() => {
				toaster.create({
					title: "ログイン成功",
					type: "success",
					duration: 1500,
				});
			});
			// これがないと戻るときにも表示される可能性があるため state を消す
			window.history.replaceState({}, document.title);
		}
	},[location.state]);
	return (
		<>
			<HeadBar otherElements={[<ReturnButton address={"/admin"} />,<HomeButton address={"/"} />]}>
					<Box 
						w={"100%"} 
						h={"100%"}
						px={"5%"}
						py={["10%", null, "5%"]}
						>
						<Heading size={["lg", null, "2xl"]}>管理者用ページ</Heading>
						<Text fontSize={["sm", null, "md"]}>ここはログイン済みのユーザーのみアクセス可能です。</Text>
						<EditableDataTable/>
					</Box>
			</HeadBar>
			<Toaster />
		</>
	);
}

export default SettingsPage;