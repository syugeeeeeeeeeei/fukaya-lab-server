import React from 'react';
import './App.css';

interface Service {
  emoji: string;
  name: string;
  url: string;
  description: string;
  user?: string;
  password?: string;
  enabled: boolean;
}

interface SshInfo {
  emoji: string;
  name: string;
  user: string;
  host: string;
  ip: string;
  command: string;
  commandIp: string;
  password?: string;
}

const services: Service[] = [
  {
    emoji: '🗓️',
    name: 'OruCa',
    url: 'http://oruca.fukaya-sus.lab',
    description: '在室管理システム',
    user: '<学籍番号>',
    password: 'fukaya_lab',
    enabled: true,
  },
  {
    emoji: '🐳',
    name: 'Portainer',
    url: 'http://portainer.fukaya-sus.lab',
    description: 'Dockerコンテナ管理UI',
    user: 'amoeba',
    password: 'fukayalab942',
    enabled: true,
  },
  {
    emoji: '🛡️',
    name: 'AdGuardHome',
    url: 'http://dns.fukaya-sus.lab',
    description: '広告・トラッカーブロック',
    user: 'amoeba',
    password: 'fukayalab942',
    enabled: true,
  },
  {
    emoji: '🌺',
    name: 'Project Botany',
    url: 'http://projectbotany.app.fukaya-sus.lab',
    description: '植物対戦ゲーム',
    enabled: true,
  },
  {
    emoji: '📝',
    name: 'AppFlowy',
    url: 'http://appflowy.fukaya-sus.lab',
    description: 'ドキュメント・ノートアプリ',
    enabled: false,
  },
  {
    emoji: '🔄',
    name: 'GitLab',
    url: 'http://gitlab.fukaya-sus.lab',
    description: 'Gitリポジトリマネージャー',
    enabled: false,
  },
  {
    emoji: '👤',
    name: 'アカウントページ',
    url: 'http://mypage.fukaya-sus.lab',
    description: 'ユーザー情報設定',
    enabled: false,
  },
  {
    emoji: '⚙️',
    name: '管理者ページ',
    url: 'http://admin.fukaya-sus.lab',
    description: '各種システム管理',
    enabled: false,
  },
];

const sshInfo: SshInfo = {
  emoji: '💻',
  name: 'SSHアクセス',
  user: 'amoeba',
  host: 'ssh.fukaya-sus.lab',
  ip: '192.168.11.225',
  command: 'ssh amoeba@ssh.fukaya-sus.lab',
  commandIp: 'ssh amoeba@192.168.11.225',
  password: 'fukayalab942',
};

const ServiceCard: React.FC<{ service: Service }> = ({ service }) => (
  <div className={`service-card ${!service.enabled ? 'disabled' : ''}`}>
    <a href={service.enabled ? service.url : '#'} target="_blank" rel="noopener noreferrer" className="service-link">
      <div className="service-header">
        <span className="emoji">{service.emoji}</span>
        <h3>{service.name}</h3>
      </div>
      <p className="description">{service.description}</p>
      <small className="url">{service.url}</small>
    </a>
    {service.enabled && (service.user || service.password) && (
      <div className="login-info">
        <h4>ログイン情報</h4>
        {service.user && <p><strong>ユーザー名:</strong> <code>{service.user}</code></p>}
        {service.password && <p><strong>パスワード:</strong> <code>{service.password}</code></p>}
      </div>
    )}
    {!service.enabled && <div className="coming-soon">Coming Soon</div>}
  </div>
);


const SshCard: React.FC<{ info: SshInfo }> = ({ info }) => (
  <div className="ssh-card">
    <div className="service-header">
      <span className="emoji">{info.emoji}</span>
      <h3>{info.name}</h3>
    </div>
    <p className="description">サーバーへSSHで接続する情報です。</p>
    <div className="ssh-details">
      <p><strong>ホスト名:</strong> <code>{info.host}</code></p>
      <p><strong>IPアドレス:</strong> <code>{info.ip}</code></p>
    </div>
    <div className="login-info">
      <h4>ログイン情報</h4>
      <p><strong>ユーザー名:</strong> <code>{info.user}</code></p>
      <p><strong>パスワード:</strong> <code>{info.password}</code></p>
    </div>
    <div className="command-info">
      <h4>接続コマンド</h4>
      <pre><code>{info.command}</code></pre>
      <pre><code>{info.commandIp}</code></pre>
    </div>
  </div>
);

function App() {
  const enabledServices = services.filter(s => s.enabled);
  const disabledServices = services.filter(s => !s.enabled);

  return (
    <div className="container">
      <header>
        <h1>🖥️ 研究室サーバー ポータル</h1>
        <p>Fukaya Lab Server Services</p>
      </header>

      <main>
        <section>
          <h2>稼働中のサービス</h2>
          <div className="service-grid">
            {enabledServices.map(service => (
              <ServiceCard key={service.name} service={service} />
            ))}
            <SshCard info={sshInfo} />
          </div>
        </section>

        <section>
          <h2>追加予定のサービス</h2>
          <div className="service-grid">
            {disabledServices.map(service => (
              <ServiceCard key={service.name} service={service} />
            ))}
          </div>
        </section>
      </main>

      <footer>
        <p>利用前に研究室LAN (fukaya_lab_st) に接続してください。</p>
      </footer>
    </div>
  );
}

export default App;