import { Box } from "@chakra-ui/react";
import HeadBar from "@components/HeadBar";
import SettingButton from "@components/Buttons/SettingButton";
import DataTable from "@pages/MainPage/DataTable";

function MainPage() {
	return (
		<>
			<HeadBar otherElements={[
				<SettingButton address="/admin" />
			]}>
				<Box
					w={"100%"}
					h={"100%"}
					px={"5%"}
					py={["10%", null, "5%"]}
				>
					<DataTable />
				</Box>
			</HeadBar>
		</>
	);
}

export default MainPage
