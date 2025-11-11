USE OruCa_DB;

CREATE TABLE users (
    student_ID VARCHAR(16) NOT NULL PRIMARY KEY,
    student_Name VARCHAR(64),
    student_token VARCHAR(64) NOT NULL
);

CREATE TABLE logs (
    student_ID VARCHAR(16) NOT NULL PRIMARY KEY,
    isInRoom BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_logs_users FOREIGN KEY (student_ID) REFERENCES users (student_ID) ON DELETE CASCADE
);

CREATE VIEW student_token_view AS
SELECT u.student_ID, u.student_token
FROM users u
    JOIN logs l ON u.student_ID = l.student_ID;

CREATE VIEW student_log_view AS
SELECT l.student_ID, u.student_Name, l.isInRoom, l.updated_at
FROM logs l
    JOIN users u ON l.student_ID = u.student_ID;

CREATE VIEW student_name_view AS
SELECT l.student_ID, u.student_Name
FROM logs l
    JOIN users u ON l.student_ID = u.student_ID;

DELIMITER $$

CREATE PROCEDURE insert_or_update_log(IN stuID VARCHAR(16))
BEGIN
    DECLARE admin_pass VARCHAR(32);
    DECLARE student_salt VARCHAR(64);
    DECLARE student_token VARCHAR(64);
    
    SET admin_pass = 'fukaya_lab';

    select admin_pass;
    
    -- ランダムなsaltの生成（例としてUUIDを使用）
    SET student_salt = SHA2(stuID,256);

    select student_salt;

    -- ハッシュ生成 (saltとpasswordを結合してハッシュ化)
    SET student_token = SHA2(CONCAT(stuID, admin_pass, student_salt), 256);

    select student_token;

    -- usersテーブルへのINSERT (saltとtokenを保存)
    
    IF NOT EXISTS (SELECT 1 FROM users WHERE student_ID = stuID) THEN
        INSERT INTO users (student_ID,student_Name, student_token)
        VALUES (stuID,NULL,student_token);
    END IF;

    -- logsテーブルへのINSERT/UPDATE
    INSERT INTO
        logs (student_ID, isInRoom)
    VALUES (stuID, TRUE)
    ON DUPLICATE KEY UPDATE
        isInRoom = NOT isInRoom,
        updated_at = CURRENT_TIMESTAMP;
END$$

CREATE PROCEDURE update_student_name(IN stuID VARCHAR(16),IN stuName VARCHAR(64))
BEGIN
    UPDATE users 
        SET student_Name = stuName 
        WHERE student_ID = stuID;
END$$

CREATE PROCEDURE get_student_token(IN stuID VARCHAR(16))
BEGIN
    SELECT student_token
    FROM student_token_view
    WHERE student_ID = stuID;
END$$