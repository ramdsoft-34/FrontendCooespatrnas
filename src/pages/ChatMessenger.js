import React, { useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import {
    Search, Send, Paperclip, X, Check, CheckCheck,
    FileText, Mic, ArrowLeft, Phone, MoreVertical,
    PhoneOff, PhoneIncoming, PhoneMissed, PhoneCall,
    Users, Plus, UserPlus, UserMinus, LogOut, Edit2,
    ChevronRight, Info, Trash2,
} from 'lucide-react';
import styles from './ChatMessenger.module.css';

const CHAT_SOCKET = 'https://surmeet.cooespatrans.com';
const CHAT_HTTP = 'https://surmeet.cooespatrans.com/api';

const chatToken = () => localStorage.getItem('chat_token');
const hdrs = () => ({ Authorization: `Bearer ${chatToken()}` });
const hdrsJ = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${chatToken()}` });

const ADMIN_ROLES = new Set(['admin', 'adminSede']);

const fmtTime = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
};
const fmtPreview = (d) => {
    if (!d) return '';
    const date = new Date(d), today = new Date(), yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === today.toDateString())
        return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
    if (date.toDateString() === yesterday.toDateString()) return 'Ayer';
    return date.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: '2-digit' });
};
const fmtDay = (d) => {
    if (!d) return '';
    const date = new Date(d), today = new Date(), yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return 'Hoy';
    if (date.toDateString() === yesterday.toDateString()) return 'Ayer';
    return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
};
const fmtDuration = (s) => {
    if (!s || s <= 0) return '';
    const m = Math.floor(s / 60), sec = s % 60;
    return m > 0 ? `${m}m ${sec.toString().padStart(2, '0')}s` : `${sec}s`;
};
const avatar = (name = '') => {
    const parts = name.trim().split(' ').filter(Boolean);
    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase() || '??';
};
const avatarColor = (name = '') => {
    const colors = ['#d9544d','#e07b39','#c5a028','#4caf7d','#3d9be9','#7c6fe0','#d65d9e','#44a699','#e06c4b','#5b8dd9'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
};
const genCallId = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
});

// ════════════════════════════════════════════════════════
// COMPONENTES BASE
// ════════════════════════════════════════════════════════
function StatusIcon({ status }) {
    if (status === 'read') return <CheckCheck size={14} color="#53bdeb" />;
    if (status === 'delivered') return <CheckCheck size={14} color="#8696a0" />;
    return <Check size={14} color="#8696a0" />;
}
function DateDivider({ label }) {
    return <div className={styles.dateDivider}><span>{label}</span></div>;
}
function FilePreview({ msg }) {
    if (msg.fileType === 'image') return (
        <div className={styles.imgWrap}>
            <img src={msg.fileUrl} alt={msg.fileName || 'imagen'} className={styles.msgImg}
                onClick={() => window.open(msg.fileUrl, '_blank')} />
            {msg.content && <p className={styles.bubbleText} style={{ marginTop: 4, paddingRight: 0 }}>{msg.content}</p>}
        </div>
    );
    if (msg.fileType === 'audio') return (
        <div className={styles.audioWrap}>
            <Mic size={16} className={styles.audioIcon} />
            <audio controls src={msg.fileUrl} className={styles.audioPlayer} />
        </div>
    );
    return (
        <a href={msg.fileUrl} target="_blank" rel="noreferrer" className={styles.fileLink}>
            <FileText size={18} /><span>{msg.fileName || 'Archivo adjunto'}</span>
        </a>
    );
}
function CallBubble({ msg, isMe }) {
    const ct = msg.callType;
    let Icon = PhoneCall, label = 'Llamada', color = '#667781';
    if (ct === 'call_missed') { Icon = PhoneMissed; label = 'Llamada perdida'; color = '#dc2626'; }
    else if (ct === 'call_outgoing') { Icon = PhoneCall; label = 'Llamada realizada'; color = '#667781'; }
    else if (ct === 'call_ended') { Icon = isMe ? PhoneCall : PhoneIncoming; label = isMe ? 'Saliente' : 'Entrante'; color = '#16a34a'; }
    return (
        <div className={`${styles.bubbleWrap} ${isMe ? styles.bubbleWrapMe : styles.bubbleWrapOther}`}>
            <div className={`${styles.bubble} ${isMe ? styles.bubbleMe : styles.bubbleOther} ${styles.callBubble}`}>
                <div className={styles.callBubbleInner}>
                    <Icon size={18} color={color} />
                    <div className={styles.callBubbleInfo}>
                        <span className={styles.callBubbleLabel} style={{ color }}>{label}</span>
                        {ct === 'call_ended' && msg.callDuration > 0 && <span className={styles.callBubbleDuration}>{fmtDuration(msg.callDuration)}</span>}
                        {ct === 'call_missed' && <span className={styles.callBubbleDuration} style={{ color: '#dc2626' }}>Sin respuesta</span>}
                    </div>
                </div>
                <div className={styles.bubbleMeta}>
                    <span className={styles.bubbleTime}>{fmtTime(msg.createdAt)}</span>
                    {isMe && <StatusIcon status={msg.status} />}
                </div>
            </div>
        </div>
    );
}
function Bubble({ msg, isMe, senderName }) {
    if (msg.deletedForAll) return (
        <div className={`${styles.bubbleWrap} ${isMe ? styles.bubbleWrapMe : styles.bubbleWrapOther}`}>
            <div className={`${styles.bubble} ${isMe ? styles.bubbleMe : styles.bubbleOther} ${styles.bubbleDeleted}`}>
                <div className={styles.bubbleInner}>
                    <span className={styles.deletedText}>🚫 Mensaje eliminado</span>
                    <span className={styles.bubbleMetaInline}><span className={styles.bubbleTime}>{fmtTime(msg.createdAt)}</span></span>
                </div>
            </div>
        </div>
    );
    if (msg.type === 'call') return <CallBubble msg={msg} isMe={isMe} />;
    const hasFile = !!msg.fileUrl;
    return (
        <div className={`${styles.bubbleWrap} ${isMe ? styles.bubbleWrapMe : styles.bubbleWrapOther}`}>
            <div className={`${styles.bubble} ${isMe ? styles.bubbleMe : styles.bubbleOther}`}>
                {!isMe && senderName && <div className={styles.bubbleSender}>{senderName}</div>}
                {hasFile ? (
                    <>
                        <FilePreview msg={msg} />
                        <div className={styles.bubbleMeta}>
                            <span className={styles.bubbleTime}>{fmtTime(msg.createdAt)}</span>
                            {isMe && <StatusIcon status={msg.status} />}
                        </div>
                    </>
                ) : (
                    <div className={styles.bubbleInner}>
                        <span className={styles.bubbleText}>{msg.content}</span>
                        <span className={styles.bubbleMetaInline}>
                            <span className={styles.bubbleTime}>{fmtTime(msg.createdAt)}</span>
                            {isMe && <StatusIcon status={msg.status} />}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════
// OVERLAY DE LLAMADA
// ════════════════════════════════════════════════════════
function CallOverlay({ callState, contact, onHangUp, onAnswer, onReject, duration }) {
    const fmt = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
    const stateLabel = { calling: 'Llamando...', ringing: 'Llamada entrante', connected: fmt(duration), rejected: 'Llamada rechazada', ended: 'Llamada finalizada' }[callState] || '';
    return (
        <div className={styles.callOverlay}>
            <div className={styles.callCard}>
                <div className={styles.callAvatar} style={{ background: avatarColor(contact?.username || '') }}>{avatar(contact?.username || '?')}</div>
                <div className={styles.callName}>{contact?.username}</div>
                <div className={`${styles.callStateLabel} ${callState === 'connected' ? styles.callStateLabelConnected : ''}`}>{stateLabel}</div>
                <div className={styles.callButtons}>
                    {callState === 'ringing' ? (
                        <>
                            <button className={`${styles.callBtn} ${styles.callBtnReject}`} onClick={onReject}><PhoneOff size={28} /><span>Rechazar</span></button>
                            <button className={`${styles.callBtn} ${styles.callBtnAnswer}`} onClick={onAnswer}><Phone size={28} /><span>Contestar</span></button>
                        </>
                    ) : (
                        <button className={`${styles.callBtn} ${styles.callBtnReject}`} onClick={onHangUp}>
                            <PhoneOff size={28} /><span>{callState === 'calling' ? 'Cancelar' : 'Colgar'}</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════
// MODAL CREAR GRUPO
// ════════════════════════════════════════════════════════
function CreateGroupModal({ users, onClose, onCreate }) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [selected, setSelected] = useState(new Set());
    const [search, setSearch] = useState('');
    const [creating, setCreating] = useState(false);

    const filtered = users.filter(u =>
        (u.username || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(search.toLowerCase())
    );

    const toggleUser = (id) => {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const handleCreate = async () => {
        if (!name.trim()) return;
        setCreating(true);
        try {
            const res = await fetch(`${CHAT_HTTP}/groups`, {
                method: 'POST',
                headers: hdrsJ(),
                body: JSON.stringify({ name: name.trim(), description: description.trim(), memberIds: [...selected] }),
            });
            const data = await res.json();
            if (data.success) { onCreate(data.group); onClose(); }
        } catch (err) { console.error(err); }
        setCreating(false);
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <span className={styles.modalTitle}>Nuevo grupo</span>
                    <button className={styles.modalClose} onClick={onClose}><X size={18} /></button>
                </div>
                <div className={styles.modalBody}>
                    <div className={styles.groupIconWrap}><Users size={32} color="#8696a0" /></div>
                    <input className={styles.modalInput} placeholder="Nombre del grupo *" value={name} onChange={e => setName(e.target.value)} />
                    <input className={styles.modalInput} placeholder="Descripción (opcional)" value={description} onChange={e => setDescription(e.target.value)} />
                    <div className={styles.modalSection}>
                        <span className={styles.modalSectionLabel}>Participantes {selected.size > 0 && <span className={styles.selectedBadge}>{selected.size}</span>}</span>
                        <div className={styles.searchBox} style={{ margin: '8px 0' }}>
                            <Search size={14} className={styles.searchIcon} />
                            <input placeholder="Buscar usuario..." value={search} onChange={e => setSearch(e.target.value)} className={styles.searchInput} />
                        </div>
                        {selected.size > 0 && (
                            <div className={styles.chipRow}>
                                {users.filter(u => selected.has(u._id)).map(u => (
                                    <div key={u._id} className={styles.chip}>
                                        <span>{u.username}</span>
                                        <button onClick={() => toggleUser(u._id)}><X size={11} /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className={styles.userPickList}>
                            {filtered.map(u => {
                                const isSel = selected.has(u._id);
                                return (
                                    <button key={u._id} className={`${styles.userPickRow} ${isSel ? styles.userPickRowSel : ''}`} onClick={() => toggleUser(u._id)}>
                                        <div className={styles.rowAvatar} style={{ background: avatarColor(u.username), width: 36, height: 36, fontSize: 13 }}>{avatar(u.username)}</div>
                                        <div className={styles.contactInfo}>
                                            <span className={styles.contactName}>{u.username}</span>
                                            <span className={styles.contactEmail}>{u.email}</span>
                                        </div>
                                        <div className={`${styles.pickCheck} ${isSel ? styles.pickCheckSel : ''}`}>
                                            {isSel && <Check size={12} color="#fff" />}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
                <div className={styles.modalFooter}>
                    <button className={styles.modalCancelBtn} onClick={onClose}>Cancelar</button>
                    <button className={styles.modalCreateBtn} onClick={handleCreate} disabled={!name.trim() || creating}>
                        {creating ? <span className={styles.sendSpinner} /> : 'Crear grupo'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════
// MODAL INFO GRUPO
// ════════════════════════════════════════════════════════
function GroupInfoModal({ group, allUsers, myId, myRole, onClose, onGroupUpdated, onLeave }) {
    const [saving, setSaving] = useState(false);
    const [editingName, setEditingName] = useState(false);
    const [newName, setNewName] = useState(group.name);
    const [showAddMembers, setShowAddMembers] = useState(false);
    const [addSearch, setAddSearch] = useState('');
    const [addSelected, setAddSelected] = useState(new Set());
    const [adding, setAdding] = useState(false);

    const isSystemAdmin = ADMIN_ROLES.has(myRole);
    const myMember = group.members?.find(m => (m.user?._id || m.user) === myId);
    const isGroupAdmin = myMember?.role === 'admin';
    const canManage = isSystemAdmin || isGroupAdmin;
    const isCreator = (group.createdBy?._id || group.createdBy) === myId;

    const memberIds = new Set(group.members?.map(m => m.user?._id || m.user) || []);
    const nonMembers = allUsers.filter(u => !memberIds.has(u._id));
    const filteredNonMembers = nonMembers.filter(u =>
        (u.username || '').toLowerCase().includes(addSearch.toLowerCase())
    );

    const saveName = async () => {
        if (!newName.trim() || newName === group.name) { setEditingName(false); return; }
        setSaving(true);
        const res = await fetch(`${CHAT_HTTP}/groups/${group._id}/name`, {
            method: 'PATCH', headers: hdrsJ(), body: JSON.stringify({ name: newName.trim() }),
        });
        const data = await res.json();
        setSaving(false);
        if (data.success) { onGroupUpdated({ ...group, name: newName.trim() }); setEditingName(false); }
    };

    const removeMember = async (userId) => {
        if (!window.confirm('¿Eliminar a este participante del grupo?')) return;
        setSaving(true);
        const res = await fetch(`${CHAT_HTTP}/groups/${group._id}/members/${userId}`, {
            method: 'DELETE', headers: hdrs(),
        });
        const data = await res.json();
        setSaving(false);
        if (data.success) {
            const updated = { ...group, members: group.members.filter(m => (m.user?._id || m.user) !== userId) };
            onGroupUpdated(updated);
        }
    };

    const addMembers = async () => {
        if (addSelected.size === 0) return;
        setAdding(true);
        const res = await fetch(`${CHAT_HTTP}/groups/${group._id}/members`, {
            method: 'POST', headers: hdrsJ(), body: JSON.stringify({ userIds: [...addSelected] }),
        });
        const data = await res.json();
        setAdding(false);
        if (data.success) { onGroupUpdated(data.group); setShowAddMembers(false); setAddSelected(new Set()); }
    };

    const leaveGroup = async () => {
        if (!window.confirm('¿Seguro que deseas salir del grupo?')) return;
        const res = await fetch(`${CHAT_HTTP}/groups/${group._id}/leave`, { method: 'POST', headers: hdrs() });
        const data = await res.json();
        if (data.success) onLeave(group._id);
        else alert(data.message || 'No se pudo salir del grupo');
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <span className={styles.modalTitle}>Info del grupo</span>
                    <button className={styles.modalClose} onClick={onClose}><X size={18} /></button>
                </div>
                <div className={styles.modalBody}>
                    {/* Header grupo */}
                    <div className={styles.groupInfoHeader}>
                        <div className={styles.groupInfoAvatar}>
                            {group.photoUrl
                                ? <img src={group.photoUrl} alt={group.name} className={styles.groupInfoAvatarImg} />
                                : <Users size={36} color="#8696a0" />}
                        </div>
                        {editingName ? (
                            <div className={styles.editNameRow}>
                                <input className={styles.modalInput} value={newName} onChange={e => setNewName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && saveName()} autoFocus />
                                <button className={styles.modalCreateBtn} onClick={saveName} disabled={saving} style={{ padding: '6px 14px' }}>
                                    {saving ? '...' : 'OK'}
                                </button>
                                <button className={styles.modalCancelBtn} onClick={() => setEditingName(false)} style={{ padding: '6px 14px' }}>✕</button>
                            </div>
                        ) : (
                            <div className={styles.groupInfoNameRow}>
                                <span className={styles.groupInfoName}>{group.name}</span>
                                {canManage && (
                                    <button className={styles.iconBtn} onClick={() => setEditingName(true)}><Edit2 size={15} /></button>
                                )}
                            </div>
                        )}
                        <span className={styles.groupInfoCount}>{group.members?.length || 0} participantes</span>
                        {group.description && <span className={styles.groupInfoDesc}>{group.description}</span>}
                    </div>

                    {/* Miembros */}
                    <div className={styles.modalSection}>
                        <div className={styles.modalSectionLabelRow}>
                            <span className={styles.modalSectionLabel}>Participantes</span>
                            {canManage && (
                                <button className={styles.addMemberBtn} onClick={() => setShowAddMembers(!showAddMembers)}>
                                    <UserPlus size={14} /> Agregar
                                </button>
                            )}
                        </div>

                        {showAddMembers && (
                            <div className={styles.addMembersBox}>
                                <input className={styles.modalInput} placeholder="Buscar usuarios..."
                                    value={addSearch} onChange={e => setAddSearch(e.target.value)} />
                                <div className={styles.userPickList} style={{ maxHeight: 160 }}>
                                    {filteredNonMembers.map(u => {
                                        const isSel = addSelected.has(u._id);
                                        return (
                                            <button key={u._id} className={`${styles.userPickRow} ${isSel ? styles.userPickRowSel : ''}`}
                                                onClick={() => setAddSelected(prev => { const n = new Set(prev); n.has(u._id) ? n.delete(u._id) : n.add(u._id); return n; })}>
                                                <div className={styles.rowAvatar} style={{ background: avatarColor(u.username), width: 32, height: 32, fontSize: 12 }}>{avatar(u.username)}</div>
                                                <span className={styles.contactName}>{u.username}</span>
                                                <div className={`${styles.pickCheck} ${isSel ? styles.pickCheckSel : ''}`}>{isSel && <Check size={11} color="#fff" />}</div>
                                            </button>
                                        );
                                    })}
                                    {filteredNonMembers.length === 0 && <div className={styles.emptyContacts}>Todos ya son miembros</div>}
                                </div>
                                {addSelected.size > 0 && (
                                    <button className={styles.modalCreateBtn} onClick={addMembers} disabled={adding} style={{ marginTop: 8 }}>
                                        {adding ? '...' : `Agregar ${addSelected.size} participante${addSelected.size > 1 ? 's' : ''}`}
                                    </button>
                                )}
                            </div>
                        )}

                        <div className={styles.memberList}>
                            {group.members?.map(m => {
                                const uid = m.user?._id || m.user;
                                const uname = m.user?.username || uid;
                                const isCreatorM = (group.createdBy?._id || group.createdBy) === uid;
                                const isMeM = uid === myId;
                                const canRemove = canManage && !isMeM && !isCreatorM;
                                return (
                                    <div key={uid} className={styles.memberRow}>
                                        <div className={styles.rowAvatar} style={{ background: avatarColor(uname), width: 38, height: 38, fontSize: 13 }}>{avatar(uname)}</div>
                                        <div className={styles.memberInfo}>
                                            <span className={styles.memberName}>{isMeM ? `${uname} (tú)` : uname}</span>
                                            {(isCreatorM || m.role === 'admin') && (
                                                <span className={styles.memberBadge}>{isCreatorM ? 'Creador' : 'Admin'}</span>
                                            )}
                                        </div>
                                        {canRemove && (
                                            <button className={styles.removeMemberBtn} onClick={() => removeMember(uid)}><UserMinus size={15} /></button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
                <div className={styles.modalFooter}>
                    <button className={styles.leaveGroupBtn} onClick={leaveGroup}>
                        <LogOut size={15} /> Salir del grupo
                    </button>
                </div>
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════
// FILA DE CONTACTO / GRUPO
// ════════════════════════════════════════════════════════
function ContactRow({ u, isActive, isOnline, unreadCnt, lastMsg, onSelect }) {
    const isGroup = !!u.members;
    const previewText = lastMsg
        ? (lastMsg.deletedForAll ? '🚫 Mensaje eliminado'
            : lastMsg.type === 'call' ? (lastMsg.callType === 'call_missed' ? '📵 Llamada perdida' : '📞 Llamada')
                : lastMsg.fileType === 'image' ? '📷 Imagen'
                    : lastMsg.fileType === 'audio' ? '🎤 Audio'
                        : lastMsg.fileType === 'file' ? `📎 ${lastMsg.fileName || 'Archivo'}`
                            : (lastMsg.fromUsername && !isGroup ? '' : lastMsg.fromUsername ? `${lastMsg.fromUsername}: ` : '') + (lastMsg.content || ''))
        : '';

    return (
        <button className={`${styles.contactRow} ${isActive ? styles.contactRowActive : ''}`} onClick={() => onSelect(u)}>
            <div className={styles.rowAvatarWrap}>
                {isGroup && u.photoUrl
                    ? <img src={u.photoUrl} alt={u.name} className={styles.rowAvatarImg} />
                    : <div className={styles.rowAvatar} style={{ background: avatarColor(isGroup ? u.name : u.username) }}>
                        {isGroup ? <Users size={20} color="#fff" /> : avatar(u.username)}
                    </div>}
                {!isGroup && isOnline && <span className={styles.rowOnlineDot} />}
            </div>
            <div className={styles.rowBody}>
                <div className={styles.rowTop}>
                    <span className={styles.rowName}>{isGroup ? u.name : u.username}</span>
                    {lastMsg && <span className={`${styles.rowTime} ${unreadCnt > 0 ? styles.rowTimeUnread : ''}`}>{fmtPreview(lastMsg.createdAt)}</span>}
                </div>
                <div className={styles.rowBottom}>
                    <span className={`${styles.rowPreview} ${unreadCnt > 0 ? styles.rowPreviewBold : ''}`}>
                        {previewText || <span className={styles.rowNoMsg}>Sin mensajes aún</span>}
                    </span>
                    {unreadCnt > 0 && <span className={styles.unreadBadge}>{unreadCnt > 99 ? '99+' : unreadCnt}</span>}
                </div>
            </div>
        </button>
    );
}

// ════════════════════════════════════════════════════════
// LISTA DE CONTACTOS + GRUPOS
// ════════════════════════════════════════════════════════
function ContactList({ users, groups, selected, onSelect, unread, onlineUsers, search, setSearch, lastMessages, lastGroupMessages, myRole, onCreateGroup }) {
    const canCreateGroup = ADMIN_ROLES.has(myRole);

    const allItems = [
        ...groups.map(g => ({ ...g, _isGroup: true, _id: g._id, _sortKey: lastGroupMessages[g._id]?.createdAt || g.createdAt })),
        ...users.map(u => ({ ...u, _isGroup: false, _sortKey: lastMessages[u._id]?.createdAt || 0 })),
    ].filter(item => {
        const name = item._isGroup ? item.name : item.username;
        return (name || '').toLowerCase().includes(search.toLowerCase()) ||
            (!item._isGroup && (item.email || '').toLowerCase().includes(search.toLowerCase()));
    }).sort((a, b) => {
        const tA = a._sortKey ? new Date(a._sortKey).getTime() : 0;
        const tB = b._sortKey ? new Date(b._sortKey).getTime() : 0;
        return tB - tA;
    });

    return (
        <div className={styles.contactPanel}>
            <div className={styles.contactHeader}>
                <span className={styles.contactHeaderTitle}>Chats</span>
                <div className={styles.contactHeaderIcons}>
                    {canCreateGroup && (
                        <button className={styles.headerIconBtn} title="Nuevo grupo" onClick={onCreateGroup}>
                            <Users size={18} />
                        </button>
                    )}
                    <button className={styles.headerIconBtn} title="Opciones"><MoreVertical size={20} /></button>
                </div>
            </div>
            <div className={styles.searchWrap}>
                <div className={styles.searchBox}>
                    <Search size={15} className={styles.searchIcon} />
                    <input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className={styles.searchInput} />
                    {search && <button onClick={() => setSearch('')} className={styles.searchClear}><X size={13} /></button>}
                </div>
            </div>
            <div className={styles.contactList}>
                {allItems.length === 0 && <div className={styles.emptyContacts}>Sin resultados</div>}
                {allItems.map(item => (
                    <ContactRow
                        key={item._id}
                        u={item}
                        isActive={selected?._id === item._id}
                        isOnline={!item._isGroup && onlineUsers.has(item._id)}
                        unreadCnt={item._isGroup ? (unread[item._id] || 0) : (unread[item._id] || 0)}
                        lastMsg={item._isGroup ? lastGroupMessages[item._id] : lastMessages[item._id]}
                        onSelect={onSelect}
                    />
                ))}
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════
// PANEL DE CHAT (individual y grupal)
// ════════════════════════════════════════════════════════
function ChatPanel({ contact, messages, myId, myRole, onSend, onBack, isOnline, lastSeen, uploading, onStartCall, isGroup, allUsers, onGroupUpdated, onLeaveGroup }) {
    const [text, setText] = useState('');
    const [file, setFile] = useState(null);
    const [showGroupInfo, setShowGroupInfo] = useState(false);
    const fileRef = useRef(null);
    const bottomRef = useRef(null);
    const isFirstLoad = useRef(true);
    const prevContactId = useRef(null);

    useEffect(() => {
        if (prevContactId.current !== contact._id) { isFirstLoad.current = true; prevContactId.current = contact._id; }
    }, [contact._id]);

    useEffect(() => {
        if (messages.length === 0) return;
        if (isFirstLoad.current) { bottomRef.current?.scrollIntoView({ behavior: 'instant' }); isFirstLoad.current = false; }
        else { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }
    }, [messages]);

    const handleSend = () => {
        const trimmed = text.trim();
        if (!trimmed && !file) return;
        onSend({ content: trimmed, file });
        setText(''); setFile(null);
        if (fileRef.current) fileRef.current.value = '';
    };
    const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };

    const grouped = [];
    let lastDay = null;
    messages.forEach(msg => {
        const day = fmtDay(msg.createdAt);
        if (day !== lastDay) { grouped.push({ type: 'divider', label: day, key: `div-${msg._id || Math.random()}` }); lastDay = day; }
        grouped.push({ type: 'msg', msg, key: msg._id || Math.random() });
    });

    const presenceText = isGroup ? `${contact.members?.length || 0} participantes`
        : isOnline ? 'en línea' : lastSeen ? `última vez: ${fmtTime(lastSeen)}` : '';

    return (
        <div className={styles.chatPanel}>
            {showGroupInfo && isGroup && (
                <GroupInfoModal
                    group={contact}
                    allUsers={allUsers}
                    myId={myId}
                    myRole={myRole}
                    onClose={() => setShowGroupInfo(false)}
                    onGroupUpdated={(updated) => { onGroupUpdated(updated); }}
                    onLeave={(gid) => { setShowGroupInfo(false); onLeaveGroup(gid); }}
                />
            )}

            <div className={styles.chatHeader}>
                <button className={styles.backBtn} onClick={onBack}><ArrowLeft size={22} /></button>
                <div className={styles.chatAvatarWrap} onClick={isGroup ? () => setShowGroupInfo(true) : undefined} style={isGroup ? { cursor: 'pointer' } : {}}>
                    {isGroup && contact.photoUrl
                        ? <img src={contact.photoUrl} alt={contact.name} className={styles.chatAvatar} style={{ objectFit: 'cover' }} />
                        : <div className={styles.chatAvatar} style={{ background: avatarColor(isGroup ? contact.name : contact.username) }}>
                            {isGroup ? <Users size={18} color="#fff" /> : avatar(contact.username)}
                        </div>}
                </div>
                <div className={styles.chatHeaderInfo} onClick={isGroup ? () => setShowGroupInfo(true) : undefined} style={isGroup ? { cursor: 'pointer' } : {}}>
                    <div className={styles.chatHeaderName}>{isGroup ? contact.name : contact.username}</div>
                    {presenceText && <div className={styles.chatHeaderPresence}>{presenceText}</div>}
                </div>
                <div className={styles.chatHeaderActions}>
                    {!isGroup && <button className={styles.chatIconBtn} title="Llamada de voz" onClick={() => onStartCall(contact)}><Phone size={20} /></button>}
                    {isGroup && <button className={styles.chatIconBtn} title="Info del grupo" onClick={() => setShowGroupInfo(true)}><Info size={20} /></button>}
                    <button className={styles.chatIconBtn} title="Más opciones"><MoreVertical size={20} /></button>
                </div>
            </div>

            <div className={styles.msgList}>
                {grouped.length === 0 && (
                    <div className={styles.emptyChat}>
                        <p>{isGroup ? `No hay mensajes en ${contact.name} aún.` : `No hay mensajes aún.`}<br />¡Envía el primer mensaje!</p>
                    </div>
                )}
                {grouped.map(item =>
                    item.type === 'divider'
                        ? <DateDivider key={item.key} label={item.label} />
                        : <Bubble key={item.key} msg={item.msg}
                            isMe={item.msg.from?.toString() === myId || item.msg.from?._id?.toString() === myId}
                            senderName={isGroup && item.msg.fromUsername && (item.msg.from?.toString() !== myId) ? item.msg.fromUsername : null}
                        />
                )}
                <div ref={bottomRef} />
            </div>

            {file && (
                <div className={styles.filePreviewBar}>
                    <Paperclip size={14} /><span className={styles.filePreviewName}>{file.name}</span>
                    <button onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ''; }}><X size={14} /></button>
                </div>
            )}

            <div className={styles.inputArea}>
                <div className={styles.inputRow}>
                    <button className={styles.inputIconBtn} onClick={() => fileRef.current?.click()} title="Adjuntar"><Paperclip size={22} /></button>
                    <input type="file" ref={fileRef} style={{ display: 'none' }}
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.mp3,.m4a,.wav,.ogg"
                        onChange={e => setFile(e.target.files[0] || null)} />
                    <div className={styles.inputBox}>
                        <textarea placeholder={isGroup ? 'Mensaje al grupo...' : 'Escribe un mensaje aquí'}
                            value={text} onChange={e => setText(e.target.value)} onKeyDown={handleKey} rows={1} className={styles.textInput} />
                    </div>
                    <button className={`${styles.sendBtn} ${(text.trim() || file) && !uploading ? styles.sendBtnActive : styles.sendBtnMic}`}
                        onClick={handleSend} disabled={uploading}>
                        {uploading ? <span className={styles.sendSpinner} /> : (text.trim() || file) ? <Send size={20} /> : <Mic size={20} />}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════
export default function ChatMessenger({ user }) {
    const [users, setUsers] = useState([]);
    const [groups, setGroups] = useState([]);
    const [chatReady, setChatReady] = useState(false);
    const [authError, setAuthError] = useState(false);
    const [selected, setSelected] = useState(null);
    const [isSelectedGroup, setIsSelectedGroup] = useState(false);
    const [messages, setMessages] = useState([]);
    const [unread, setUnread] = useState({});
    const [lastMessages, setLastMessages] = useState({});
    const [lastGroupMessages, setLastGroupMessages] = useState({});
    const [onlineUsers, setOnlineUsers] = useState(new Set());
    const [lastSeen, setLastSeen] = useState({});
    const [search, setSearch] = useState('');
    const [uploading, setUploading] = useState(false);
    const [mobileView, setMobileView] = useState('list');
    const [showCreateGroup, setShowCreateGroup] = useState(false);

    // Llamadas
    const [callState, setCallState] = useState('idle');
    const [callContact, setCallContact] = useState(null);
    const [callDuration, setCallDuration] = useState(0);
    const [currentCallId, setCurrentCallId] = useState(null);

    const socketRef = useRef(null);
    const selectedRef = useRef(null);
    const isSelectedGroupRef = useRef(false);
    const pcRef = useRef(null);
    const localStreamRef = useRef(null);
    const callTimerRef = useRef(null);
    const callContactRef = useRef(null);
    const callStateRef = useRef('idle');
    const callIdRef = useRef(null);

    selectedRef.current = selected;
    isSelectedGroupRef.current = isSelectedGroup;
    callContactRef.current = callContact;
    callStateRef.current = callState;
    callIdRef.current = currentCallId;

    const chatUser = JSON.parse(localStorage.getItem('chat_user') || 'null');
    const myId = chatUser?._id || chatUser?.id || '';
    const myRole = chatUser?.role || '';

    const ICE_SERVERS = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] };

    // ── WebRTC helpers ────────────────────────────────────
    const _setCallState = (s) => { callStateRef.current = s; setCallState(s); };
    const _startTimer = () => { setCallDuration(0); callTimerRef.current = setInterval(() => setCallDuration(p => p + 1), 1000); };
    const _stopTimer = () => { clearInterval(callTimerRef.current); callTimerRef.current = null; };
    const _createPC = async () => {
        const pc = new RTCPeerConnection(ICE_SERVERS);
        pc.onicecandidate = ({ candidate }) => {
            if (candidate && callIdRef.current && callContactRef.current)
                socketRef.current?.emit('ice_candidate', { callId: callIdRef.current, toUserId: callContactRef.current._id, candidate: candidate.candidate, sdpMid: candidate.sdpMid, sdpMLineIndex: candidate.sdpMLineIndex });
        };
        pc.onconnectionstatechange = () => {
            if ((pc.connectionState === 'failed' || pc.connectionState === 'disconnected') && callStateRef.current === 'connected') _finishCall();
        };
        return pc;
    };
    const _getUserMedia = () => navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    const _finishCall = () => {
        _stopTimer(); pcRef.current?.close(); pcRef.current = null;
        localStreamRef.current?.getTracks().forEach(t => t.stop()); localStreamRef.current = null;
        _setCallState('ended');
        setTimeout(() => { _setCallState('idle'); setCallContact(null); setCurrentCallId(null); setCallDuration(0); }, 2000);
    };

    const handleStartCall = useCallback(async (contact) => {
        if (callStateRef.current !== 'idle') return;
        const callId = genCallId();
        setCurrentCallId(callId); callIdRef.current = callId;
        setCallContact(contact); callContactRef.current = contact;
        _setCallState('calling');
        try {
            const stream = await _getUserMedia(); localStreamRef.current = stream;
            const pc = await _createPC(); pcRef.current = pc;
            stream.getAudioTracks().forEach(t => pc.addTrack(t, stream));
            const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: false });
            await pc.setLocalDescription(offer);
            socketRef.current?.emit('call_offer', { callId, toUserId: contact._id, sdp: offer.sdp, type: offer.type });
        } catch (err) { console.error('❌ Error iniciando llamada:', err); _finishCall(); }
    }, []);

    const handleAnswerCall = useCallback(async () => {
        if (callStateRef.current !== 'ringing' || !pcRef.current) return;
        _setCallState('connected'); _startTimer();
        try {
            const stream = await _getUserMedia(); localStreamRef.current = stream;
            stream.getAudioTracks().forEach(t => pcRef.current.addTrack(t, stream));
            const answer = await pcRef.current.createAnswer();
            await pcRef.current.setLocalDescription(answer);
            socketRef.current?.emit('call_answer', { callId: callIdRef.current, toUserId: callContactRef.current?._id, sdp: answer.sdp, type: answer.type });
        } catch (err) { console.error('❌ Error contestando:', err); _finishCall(); }
    }, []);

    const handleRejectCall = useCallback(() => {
        if (callStateRef.current !== 'ringing') return;
        socketRef.current?.emit('call_reject', { callId: callIdRef.current, toUserId: callContactRef.current?._id });
        _finishCall();
    }, []);

    const handleHangUp = useCallback(() => {
        if (callStateRef.current === 'idle') return;
        socketRef.current?.emit('call_end', { callId: callIdRef.current, toUserId: callContactRef.current?._id });
        _finishCall();
    }, []);

    // ── Token check ───────────────────────────────────────
    useEffect(() => { if (!chatToken()) { setAuthError(true); return; } setChatReady(true); }, []);

    // ── Socket.IO ─────────────────────────────────────────
    useEffect(() => {
        if (!chatReady) return;
        const sock = io(CHAT_SOCKET, { auth: { token: chatToken() }, transports: ['websocket'], reconnectionAttempts: 5 });
        socketRef.current = sock;

        sock.on('connect_error', (err) => { if (err.message?.includes('Token')) setAuthError(true); });
        sock.on('user_online', ({ userId }) => setOnlineUsers(prev => new Set([...prev, userId])));
        sock.on('user_offline', ({ userId, lastSeen: ls }) => {
            setOnlineUsers(prev => { const n = new Set(prev); n.delete(userId); return n; });
            if (ls) setLastSeen(prev => ({ ...prev, [userId]: ls }));
        });

        // Mensajes individuales
        sock.on('receive_message', (msg) => {
            const cur = selectedRef.current;
            const isGroup = isSelectedGroupRef.current;
            const otherId = msg.from === myId ? msg.to : msg.from;
            setLastMessages(prev => {
                const ex = prev[otherId];
                if (!ex || new Date(msg.createdAt) > new Date(ex.createdAt)) return { ...prev, [otherId]: msg };
                return prev;
            });
            if (!isGroup && cur && (msg.from === cur._id || msg.to === cur._id)) {
                setMessages(prev => prev.find(m => m._id?.toString() === msg._id?.toString()) ? prev : [...prev, msg]);
                sock.emit('mark_read', { fromUserId: msg.from });
            } else if (!isGroup) {
                setUnread(prev => ({ ...prev, [msg.from]: (prev[msg.from] || 0) + 1 }));
            }
        });

        // Mensajes de grupo
        sock.on('receive_group_message', (msg) => {
            const cur = selectedRef.current;
            const isGrp = isSelectedGroupRef.current;
            setLastGroupMessages(prev => {
                const ex = prev[msg.groupId];
                if (!ex || new Date(msg.createdAt) > new Date(ex.createdAt)) return { ...prev, [msg.groupId]: msg };
                return prev;
            });
            if (isGrp && cur && msg.groupId === cur._id) {
                setMessages(prev => prev.find(m => m._id?.toString() === msg._id?.toString()) ? prev : [...prev, msg]);
                sock.emit('group_mark_read', { groupId: msg.groupId });
            } else {
                setUnread(prev => ({ ...prev, [msg.groupId]: (prev[msg.groupId] || 0) + 1 }));
            }
        });

        sock.on('group_message_deleted', ({ groupId, messageIds, deleteForAll }) => {
            const cur = selectedRef.current;
            if (isSelectedGroupRef.current && cur?._id === groupId) {
                setMessages(prev => deleteForAll
                    ? prev.map(m => messageIds.includes(m._id?.toString()) ? { ...m, deletedForAll: true, content: '' } : m)
                    : prev.filter(m => !messageIds.includes(m._id?.toString()))
                );
            }
        });

        sock.on('call_record', (msg) => {
            const otherId = msg.from === myId ? msg.to : msg.from;
            setLastMessages(prev => {
                const ex = prev[otherId];
                if (!ex || new Date(msg.createdAt) > new Date(ex.createdAt)) return { ...prev, [otherId]: msg };
                return prev;
            });
            const cur = selectedRef.current;
            if (!isSelectedGroupRef.current && cur && (msg.from === cur._id || msg.to === cur._id)) {
                setMessages(prev => prev.find(m => m._id?.toString() === msg._id?.toString()) ? prev : [...prev, msg]);
            }
        });

        sock.on('message_sent', (msg) => {
            setLastMessages(prev => {
                const ex = prev[msg.to];
                if (!ex || new Date(msg.createdAt) > new Date(ex.createdAt)) return { ...prev, [msg.to]: msg };
                return prev;
            });
            setMessages(prev => {
                const exists = prev.find(m => m._id?.toString() === msg._id?.toString());
                if (exists) return prev.map(m => m._id?.toString() === msg._id?.toString() ? msg : m);
                return [...prev, msg];
            });
        });

        sock.on('message_delivered', ({ messageId, deliveredAt }) =>
            setMessages(prev => prev.map(m => m._id?.toString() === messageId ? { ...m, status: 'delivered', deliveredAt } : m))
        );
        sock.on('messages_delivered', ({ messageIds, deliveredAt }) =>
            setMessages(prev => prev.map(m => messageIds.includes(m._id?.toString()) ? { ...m, status: 'delivered', deliveredAt } : m))
        );
        sock.on('messages_read', ({ byUserId, readAt }) =>
            setMessages(prev => prev.map(m => m.to?.toString() === byUserId || m.to === byUserId ? { ...m, status: 'read', read: true, readAt } : m))
        );
        sock.on('message_deleted', ({ messageIds, deleteForAll }) => {
            if (deleteForAll) setMessages(prev => prev.map(m => messageIds.includes(m._id?.toString()) ? { ...m, deletedForAll: true, content: '' } : m));
            else setMessages(prev => prev.filter(m => !messageIds.includes(m._id?.toString())));
        });

        // Llamadas
        sock.on('call_incoming', async ({ callId, fromUserId, fromUsername, sdp, type }) => {
            if (callStateRef.current !== 'idle') { sock.emit('call_reject', { callId, toUserId: fromUserId }); return; }
            setUsers(prevUsers => {
                const contact = prevUsers.find(u => u._id === fromUserId) || { _id: fromUserId, username: fromUsername || 'Usuario' };
                callContactRef.current = contact; setCallContact(contact); return prevUsers;
            });
            setCurrentCallId(callId); callIdRef.current = callId;
            try {
                const pc = await _createPC(); pcRef.current = pc;
                await pc.setRemoteDescription(new RTCSessionDescription({ sdp, type }));
                _setCallState('ringing');
            } catch (err) { sock.emit('call_reject', { callId, toUserId: fromUserId }); }
        });
        sock.on('call_answered', async ({ sdp, type }) => {
            if (callStateRef.current !== 'calling') return;
            _setCallState('connected'); _startTimer();
            try { await pcRef.current?.setRemoteDescription(new RTCSessionDescription({ sdp, type })); } catch (err) { console.error(err); }
        });
        sock.on('call_rejected', () => { if (callStateRef.current === 'calling' || callStateRef.current === 'ringing') _finishCall(); });
        sock.on('call_ended', () => { if (callStateRef.current !== 'idle') _finishCall(); });
        sock.on('ice_candidate', async ({ candidate, sdpMid, sdpMLineIndex }) => {
            if (!pcRef.current || !candidate) return;
            try { await pcRef.current.addIceCandidate(new RTCIceCandidate({ candidate, sdpMid, sdpMLineIndex })); } catch (err) { console.error(err); }
        });

        return () => { sock.disconnect(); };
    }, [chatReady, myId]);

    // ── Cargar datos iniciales ────────────────────────────
    useEffect(() => {
        if (!chatReady) return;

        // Usuarios
        fetch(`${CHAT_HTTP}/chat/users`, { headers: hdrs() })
            .then(r => r.json()).then(async d => {
                if (!d.success) return;
                const list = d.users || [];
                setUsers(list);
                const previews = {};
                await Promise.all(list.map(async u => {
                    try {
                        const r = await fetch(`${CHAT_HTTP}/chat/messages/${u._id}`, { headers: hdrs() });
                        const data = await r.json();
                        if (data.success && data.messages?.length > 0) previews[u._id] = data.messages[data.messages.length - 1];
                    } catch { }
                }));
                setLastMessages(previews);
            }).catch(console.error);

        // Grupos
        fetch(`${CHAT_HTTP}/groups`, { headers: hdrs() })
            .then(r => r.json()).then(async d => {
                if (!d.success) return;
                const list = d.groups || [];
                setGroups(list);
                // Unirse a rooms de grupos
                list.forEach(g => socketRef.current?.emit('join_group', { groupId: g._id }));
                // Previews de grupos
                const previews = {};
                await Promise.all(list.map(async g => {
                    try {
                        const r = await fetch(`${CHAT_HTTP}/groups/${g._id}/messages`, { headers: hdrs() });
                        const data = await r.json();
                        if (data.success && data.messages?.length > 0) previews[g._id] = data.messages[data.messages.length - 1];
                    } catch { }
                }));
                setLastGroupMessages(previews);
            }).catch(console.error);

        fetch(`${CHAT_HTTP}/chat/unread`, { headers: hdrs() })
            .then(r => r.json()).then(d => { if (d.success) setUnread(d.unread || {}); }).catch(console.error);
    }, [chatReady]);

    // ── Seleccionar chat ──────────────────────────────────
    const handleSelect = useCallback(async (item) => {
        const isGroup = !!item.members;
        setSelected(item); setIsSelectedGroup(isGroup); setMobileView('chat');
        setUnread(prev => ({ ...prev, [item._id]: 0 }));

        try {
            const url = isGroup ? `${CHAT_HTTP}/groups/${item._id}/messages` : `${CHAT_HTTP}/chat/messages/${item._id}`;
            const res = await fetch(url, { headers: hdrs() });
            const data = await res.json();
            if (data.success) {
                const msgs = data.messages || [];
                setMessages(msgs);
                if (msgs.length > 0) {
                    if (isGroup) setLastGroupMessages(prev => ({ ...prev, [item._id]: msgs[msgs.length - 1] }));
                    else setLastMessages(prev => ({ ...prev, [item._id]: msgs[msgs.length - 1] }));
                }
                if (isGroup) socketRef.current?.emit('group_mark_read', { groupId: item._id });
            }
        } catch { setMessages([]); }

        if (!isGroup) {
            socketRef.current?.emit('mark_read', { fromUserId: item._id });
            socketRef.current?.emit('get_presence', { userId: item._id });
            socketRef.current?.once('presence_status', ({ userId, isOnline, lastSeen: ls }) => {
                if (userId === item._id) {
                    if (isOnline) setOnlineUsers(prev => new Set([...prev, userId]));
                    if (ls) setLastSeen(prev => ({ ...prev, [userId]: ls }));
                }
            });
        }
    }, []);

    // ── Enviar mensaje ────────────────────────────────────
    const handleSend = useCallback(async ({ content, file }) => {
        if (!selected) return;
        let fileUrl = null, fileType = null, fileName = null;
        if (file) {
            setUploading(true);
            try {
                const fd = new FormData(); fd.append('file', file);
                const res = await fetch(`${CHAT_HTTP}/chat/upload`, { method: 'POST', headers: { Authorization: `Bearer ${chatToken()}` }, body: fd });
                const data = await res.json();
                if (!data.success) throw new Error(data.message);
                fileUrl = data.fileUrl; fileType = data.fileType; fileName = data.fileName;
            } catch (err) { console.error('Upload error:', err); setUploading(false); return; }
            setUploading(false);
        }
        if (isSelectedGroup) {
            socketRef.current?.emit('send_group_message', { groupId: selected._id, content: content || '', fileUrl, fileType, fileName });
        } else {
            socketRef.current?.emit('send_message', { toUserId: selected._id, content: content || '', fileUrl, fileType, fileName });
        }
    }, [selected, isSelectedGroup]);

    // ── Crear grupo ───────────────────────────────────────
    const handleGroupCreated = useCallback((group) => {
        setGroups(prev => [group, ...prev]);
        socketRef.current?.emit('join_group', { groupId: group._id });
    }, []);

    // ── Actualizar grupo ──────────────────────────────────
    const handleGroupUpdated = useCallback((updated) => {
        setGroups(prev => prev.map(g => g._id === updated._id ? updated : g));
        if (selected?._id === updated._id) setSelected(updated);
    }, [selected]);

    // ── Salir del grupo ───────────────────────────────────
    const handleLeaveGroup = useCallback((groupId) => {
        socketRef.current?.emit('leave_group_room', { groupId });
        setGroups(prev => prev.filter(g => g._id !== groupId));
        if (selected?._id === groupId) { setSelected(null); setIsSelectedGroup(false); setMobileView('list'); }
    }, [selected]);

    if (authError) return (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, padding: 40, textAlign: 'center', background: '#f0f2f5' }}>
            <div style={{ fontSize: 48 }}>🔒</div>
            <h3 style={{ margin: 0, fontSize: 18, color: '#1a2236' }}>Sesión de chat no disponible</h3>
            <p style={{ margin: 0, color: '#667781', maxWidth: 320, fontSize: 14 }}>Cierra sesión y vuelve a iniciar sesión para activar el chat.</p>
        </div>
    );

    return (
        <div className={styles.messenger}>
            {callState !== 'idle' && (
                <CallOverlay callState={callState} contact={callContact} duration={callDuration}
                    onHangUp={handleHangUp} onAnswer={handleAnswerCall} onReject={handleRejectCall} />
            )}
            {showCreateGroup && (
                <CreateGroupModal users={users} onClose={() => setShowCreateGroup(false)} onCreate={handleGroupCreated} />
            )}

            <div className={`${styles.leftPanel} ${mobileView === 'chat' ? styles.hideMobile : ''}`}>
                <ContactList
                    users={users} groups={groups} selected={selected}
                    onSelect={handleSelect} unread={unread} onlineUsers={onlineUsers}
                    search={search} setSearch={setSearch}
                    lastMessages={lastMessages} lastGroupMessages={lastGroupMessages}
                    myRole={myRole} onCreateGroup={() => setShowCreateGroup(true)}
                />
            </div>
            <div className={`${styles.rightPanel} ${mobileView === 'list' ? styles.hideMobile : ''}`}>
                {selected ? (
                    <ChatPanel
                        contact={selected} messages={messages} myId={myId} myRole={myRole}
                        onSend={handleSend}
                        onBack={() => { setSelected(null); setIsSelectedGroup(false); setMobileView('list'); }}
                        isOnline={!isSelectedGroup && onlineUsers.has(selected._id)}
                        lastSeen={!isSelectedGroup ? lastSeen[selected._id] : null}
                        uploading={uploading}
                        onStartCall={handleStartCall}
                        isGroup={isSelectedGroup}
                        allUsers={users}
                        onGroupUpdated={handleGroupUpdated}
                        onLeaveGroup={handleLeaveGroup}
                    />
                ) : (
                    <div className={styles.noChat}>
                        <div className={styles.noChatInner}>
                            <div className={styles.noChatIcon}>💬</div>
                            <h3>Selecciona un chat</h3>
                            <p>Elige un usuario o grupo para comenzar</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}