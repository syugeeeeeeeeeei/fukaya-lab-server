import { Grid, GridItem, Heading, HStack, Icon, Text, VStack } from "@chakra-ui/react";
import React from "react";
import { FaAnchor } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

type THeadBar = {
	otherElements?: React.ReactNode[]
	children?: React.ReactNode
};

const HeadBar: React.FC<THeadBar> = ({ otherElements, children }) => {
	const navigate = useNavigate();
	const navigateMainPage = ()=>{
		navigate("/");
	}
	return (
		<Grid h={"100vh"} templateRows={"fit-content(100%) 1fr"} gap={0} color={"default"}>
			<GridItem>
				<HStack
					w={"100%"}
					h={"100%"}
					px={4}
					py={[2, null, 5]}
					justifyContent={"space-between"}
					borderBottomWidth={1}
					shadow={"xs"}
				>
					<VStack gap={0} onClick={navigateMainPage} cursor={"pointer"}>
						<HStack
							w={"100%"}
							gap={2}
						>
							<Icon
								size={["md", null, "xl"]}>
								<FaAnchor
									width={"100%"}
									height={"100%"}
								/>
							</Icon>
							<Heading
								size={["xl", null, "4xl"]}
								pb={1}
							>OruCa</Heading>
						</HStack>
						<Text fontFamily={"monospace"} fontSize={["xs",null,"md"]} fontWeight={"semibold"}>FeliCa 在室管理システム</Text>
					</VStack>
					<HStack gap={4} justify={"center"}>
						{otherElements?.map((e, index) => (
							<React.Fragment key={`HeadBarOtherElements-${index}`}>
								{e}
							</React.Fragment>
						))}
					</HStack>
				</HStack>	
			</GridItem>
			<GridItem overflowY="auto">
				{children}
			</GridItem>
		</Grid>
	);
}

export default HeadBar;