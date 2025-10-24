// GenericDataTable.tsx
import { Table } from '@chakra-ui/react';
import TableEmptyState from '@components/TableEmptyState';
import { ReactNode } from 'react';

// 汎用テーブルコンポーネントの型定義
export interface ColumnDefinition {
	header: string;
	width?: string;
	key?: string;
}

export interface TableStyles {
	headerBg?: string;
	hoverBg?: string;
	borderWidth?: string;
	shadow?: string;
	maxHeight?: string;
}

interface GenericDataTableProps<T> {
	columns: ColumnDefinition[];
	data: T[];
	renderRow: (item: T, index: number) => ReactNode;
	styles?: TableStyles;
	stickyHeader?: boolean;
	emptyState?: ReactNode;
}

// 汎用データテーブルコンポーネント
function GenericDataTable<T>({
	columns,
	data,
	renderRow,
	styles = {},
	stickyHeader = true,
	emptyState,
}: GenericDataTableProps<T>) {
	// デフォルトスタイル
	const defaultStyles: TableStyles = {
		headerBg: "rgb(43, 37, 108)",
		hoverBg: 'gray.100',
		borderWidth: "2px",
		shadow: "md",
		maxHeight: "80vh",
	};

	// スタイルのマージ
	const mergedStyles = { ...defaultStyles, ...styles };

	// ヘッダーのスタイル
	const thStyles: Table.ColumnHeaderProps = {
		color: "gray.100",
		textAlign: "center",
		fontWeight: "bold",
		textTransform: "uppercase",
		fontSize: ["xs", null, "lg"],
		p: [1, null, 3],
	};

	// セルのスタイル
	const tdStyles: Table.CellProps = {
		color: "default",
		textAlign: "center",
		letterSpacing: 1,
		fontWeight: "semibold",
		fontSize: ["2xs", "md", "lg","xl"],
		px: [1, null, 2],
		py: [0.5, null, 1.5],
		overflow: "hidden",
		whiteSpace: "nowrap",
		textOverflow: "ellipsis",
	};

	// テーブル本体のレンダリング
	const TableBody = () => {
		if (data.length <= 0) {
			return (
				<Table.Row>
					<Table.Cell colSpan={columns.length} {...tdStyles}>
						{emptyState || <TableEmptyState />}
					</Table.Cell>
				</Table.Row>
			);
		} else {
			return (
				<>
					{data.map((item, index) => renderRow(item, index))}
				</>
			);
		}
	};

	return (
		<Table.ScrollArea
			borderWidth={mergedStyles.borderWidth}
			rounded="md"
			shadow={mergedStyles.shadow}
			maxH={mergedStyles.maxHeight}
		>
			<Table.Root variant="outline" size="md" stickyHeader={stickyHeader} tableLayout="fixed">
				<Table.Header bg={mergedStyles.headerBg}>
					<Table.Row>
						{columns.map((column, index) => (
							<Table.ColumnHeader
								key={column.key || index}
								{...thStyles}
								w={column.width}
							>
								{column.header}
							</Table.ColumnHeader>
						))}
					</Table.Row>
				</Table.Header>
				<Table.Body fontSize="xl">
					<TableBody />
				</Table.Body>
			</Table.Root>
		</Table.ScrollArea>
	);
}

// ヘルパー関数として、テーブルセルのデフォルトスタイルをエクスポート
export const getDefaultCellStyles = (): Table.CellProps => ({
	color: "default",
	textAlign: "center",
	letterSpacing: 1,
	fontWeight: "semibold",
	fontSize: ["xs", null, "lg"],
	px: [1, null, 2],
	py: [0.5, null, 1.5]
});

export default GenericDataTable;