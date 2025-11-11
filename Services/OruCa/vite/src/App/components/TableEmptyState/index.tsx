import { EmptyState, VStack } from "@chakra-ui/react";
import { TbTableOff } from "react-icons/tb";

const TableEmptyState = () => {
	return (
		<EmptyState.Root>
			<EmptyState.Content>
				<EmptyState.Indicator>
					<TbTableOff />
				</EmptyState.Indicator>
				<VStack textAlign="center">
					<EmptyState.Title>Student Data is Empty</EmptyState.Title>
					<EmptyState.Description>
						FeliCaに学生証をかざしてユーザーを登録してね
					</EmptyState.Description>
				</VStack>
			</EmptyState.Content>
		</EmptyState.Root>
	)
}

export default TableEmptyState